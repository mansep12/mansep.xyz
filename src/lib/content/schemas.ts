/**
 * Frontmatter schemas for the localized Markdown collections. Kept apart from
 * src/content.config.ts so they can be unit tested without Astro's runtime.
 */

import { z } from "astro/zod";

const DASHES = /[\u2013\u2014]/;

/** Visible single-line text: trimmed, non-empty, no line breaks, no en or em dashes. */
export const line = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !/[\r\n]/.test(value), "Must be a single line")
  .refine(
    (value) => !DASHES.test(value),
    "Use a comma, colon or parentheses instead of en or em dashes",
  );

const year = z.string().regex(/^\d{4}$/, 'Use a four-digit year, e.g. "2026"');

/** Absolute URL or a site-relative path such as `/cv/thesis.pdf`. */
const href = z.union([
  z.url(),
  z.string().regex(/^\/[^/]/, "Use an absolute URL or a path from /"),
]);

export const projectStatuses = ["done", "mvp", "in-progress", "paused"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const projectSchema = z
  .object({
    title: line,
    /** One line: what it is. */
    summary: line,
    /** One line: the headline result. */
    outcome: line,
    /** Position in lists, ascending. */
    order: z.number().int().nonnegative(),
    year,
    status: z.enum(projectStatuses),
    role: line,
    team: z
      .object({
        size: z.number().int().positive(),
        note: line.optional(),
      })
      .optional(),
    event: z
      .object({
        name: line,
        hours: z.number().positive().optional(),
        award: line.optional(),
      })
      .optional(),
    stack: z.array(line).min(1),
    links: z.object({
      repo: z.url().optional(),
      demo: z.url().optional(),
      video: z.url().optional(),
      youtubeId: z
        .string()
        .regex(/^[\w-]{11}$/, "Use the 11-character YouTube video id")
        .optional(),
    }),
    license: line.optional(),
    featured: z.boolean().default(false),
  })
  // A project is only listed if a reader can verify it.
  .refine((project) => Boolean(project.links.repo ?? project.links.demo), {
    message: "A project needs links.repo or links.demo",
    path: ["links"],
  });

export type ProjectData = z.output<typeof projectSchema>;

export const researchKinds = ["thesis", "capsule", "course"] as const;
export type ResearchKind = (typeof researchKinds)[number];

export const researchSchema = z.object({
  title: line,
  summary: line,
  institution: line,
  advisors: z.array(line).default([]),
  /** Free text, e.g. "In progress" or "Defended". */
  status: line,
  year,
  kind: z.enum(researchKinds),
  links: z
    .object({
      repo: z.url().optional(),
      pdf: href.optional(),
      /** Bare DOI, e.g. "10.5281/zenodo.123456". */
      doi: z
        .string()
        .regex(/^10\.\d{4,9}\/\S+$/, 'Use a bare DOI such as "10.5281/zenodo.123456"')
        .optional(),
    })
    .optional(),
});

export type ResearchData = z.output<typeof researchSchema>;

/** Prose pages (about, privacy, colophon): the body is the page text. */
export const pageSchema = z.object({
  /** Page heading and document title. */
  title: line,
  /** Meta and social description. */
  description: line,
});

export type PageData = z.output<typeof pageSchema>;
