/**
 * CV data: one JSON file per locale in the JSON Resume shape
 * (https://jsonresume.org/schema), with two deliberate differences:
 *
 * - Every highlight is `{ id, text }` instead of a plain string. Ids are
 *   stable across edits and identical in both locales (e.g.
 *   "dimacofi.rpa.01"), so the CV generator can select highlights by id.
 * - Objects are strict and `basics` has no `phone`, and `location` has no
 *   `address` or `postalCode`: private details fail validation.
 *
 * Both files are validated at build time through the `resume` collection in
 * src/content.config.ts.
 */

import { z } from "astro/zod";
import { type Lang, locales } from "../i18n/locales";
import en from "./resume.en.json";
import es from "./resume.es.json";

/** ISO 8601 date with optional month and day, as JSON Resume uses. */
const date = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "Use YYYY, YYYY-MM or YYYY-MM-DD");

const text = z.string().trim().min(1);

const HIGHLIGHT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

export const highlightSchema = z.strictObject({
  id: z
    .string()
    .regex(HIGHLIGHT_ID, 'Use dot-separated lowercase segments, e.g. "dimacofi.rpa.01"'),
  text,
});

const highlights = z.array(highlightSchema).default([]);

const locationSchema = z.strictObject({
  city: text.optional(),
  region: text.optional(),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
});

const profileSchema = z.strictObject({
  network: text,
  username: text.optional(),
  url: z.url(),
});

const basicsSchema = z.strictObject({
  name: text,
  label: text,
  image: z.url().optional(),
  email: z.email(),
  url: z.url().optional(),
  summary: text.optional(),
  location: locationSchema.optional(),
  profiles: z.array(profileSchema).default([]),
});

const workSchema = z.strictObject({
  name: text,
  position: text,
  url: z.url().optional(),
  location: text.optional(),
  startDate: date,
  endDate: date.optional(),
  summary: text.optional(),
  highlights,
});

const volunteerSchema = z.strictObject({
  organization: text,
  position: text,
  url: z.url().optional(),
  startDate: date,
  endDate: date.optional(),
  summary: text.optional(),
  highlights,
});

const educationSchema = z.strictObject({
  institution: text,
  url: z.url().optional(),
  area: text.optional(),
  studyType: text.optional(),
  startDate: date.optional(),
  endDate: date.optional(),
  score: text.optional(),
  courses: z.array(text).default([]),
});

const awardSchema = z.strictObject({
  title: text,
  date: date.optional(),
  awarder: text.optional(),
  summary: text.optional(),
});

const certificateSchema = z.strictObject({
  name: text,
  date: date.optional(),
  issuer: text.optional(),
  url: z.url().optional(),
});

const publicationSchema = z.strictObject({
  name: text,
  publisher: text.optional(),
  releaseDate: date.optional(),
  url: z.url().optional(),
  summary: text.optional(),
});

const skillSchema = z.strictObject({
  name: text,
  level: text.optional(),
  keywords: z.array(text).default([]),
});

const languageSchema = z.strictObject({
  language: text,
  fluency: text.optional(),
});

const interestSchema = z.strictObject({
  name: text,
  keywords: z.array(text).default([]),
});

const projectSchema = z.strictObject({
  name: text,
  description: text.optional(),
  url: z.url().optional(),
  startDate: date.optional(),
  endDate: date.optional(),
  roles: z.array(text).default([]),
  keywords: z.array(text).default([]),
  highlights,
});

const metaSchema = z.strictObject({
  canonical: z.url().optional(),
  version: text.optional(),
  lastModified: text.optional(),
});

export const resumeSchema = z.strictObject({
  basics: basicsSchema,
  work: z.array(workSchema).default([]),
  volunteer: z.array(volunteerSchema).default([]),
  education: z.array(educationSchema).default([]),
  awards: z.array(awardSchema).default([]),
  certificates: z.array(certificateSchema).default([]),
  publications: z.array(publicationSchema).default([]),
  skills: z.array(skillSchema).default([]),
  languages: z.array(languageSchema).default([]),
  interests: z.array(interestSchema).default([]),
  projects: z.array(projectSchema).default([]),
  meta: metaSchema.optional(),
});

export type Resume = z.output<typeof resumeSchema>;
export type Highlight = z.output<typeof highlightSchema>;

/** Shape of an entry in the `resume` collection: the resume plus its locale as id. */
export const resumeEntrySchema = resumeSchema.extend({ id: z.enum(locales) });

/** Every highlight id in a resume, in document order. */
export function highlightIds(resume: Resume): string[] {
  return [...resume.work, ...resume.volunteer, ...resume.projects].flatMap((item) =>
    item.highlights.map((highlight) => highlight.id),
  );
}

/**
 * Validates the resume of every locale, then checks that highlight ids are
 * unique within a locale and identical across locales. Throws one error that
 * lists every problem.
 */
export function parseResumes(raw: Readonly<Record<Lang, unknown>>): Record<Lang, Resume> {
  const problems: string[] = [];
  const parsed: Partial<Record<Lang, Resume>> = {};

  for (const lang of locales) {
    const result = resumeSchema.safeParse(raw[lang]);
    if (result.success) {
      parsed[lang] = result.data;
    } else {
      problems.push(`resume.${lang}.json:\n${z.prettifyError(result.error)}`);
    }
  }

  const idsByLang = new Map<Lang, Set<string>>();
  for (const lang of locales) {
    const resume = parsed[lang];
    if (!resume) continue;
    const ids = highlightIds(resume);
    const unique = new Set(ids);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      problems.push(
        `resume.${lang}.json: duplicate highlight ids: ${[...new Set(duplicates)].join(", ")}`,
      );
    }
    idsByLang.set(lang, unique);
  }

  if (idsByLang.size === locales.length) {
    for (const lang of locales) {
      const own = idsByLang.get(lang) ?? new Set<string>();
      for (const other of locales) {
        if (other === lang) continue;
        const missing = [...(idsByLang.get(other) ?? [])].filter((id) => !own.has(id));
        if (missing.length > 0) {
          problems.push(
            `resume.${lang}.json: missing highlight ids present in ${other}: ${missing.join(", ")}`,
          );
        }
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid CV data\n\n${problems.join("\n\n")}`);
  }
  return parsed as Record<Lang, Resume>;
}

/** Reads and validates src/data/resume.{es,en}.json. */
export function loadResumes(): Record<Lang, Resume> {
  return parseResumes({ es, en });
}
