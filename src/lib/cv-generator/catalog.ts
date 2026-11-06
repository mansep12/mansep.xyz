/**
 * The catalog: every verified highlight the model may cite, per locale.
 *
 * It covers the two sections <CvDocument> renders with highlights (work and
 * projects). Each highlight keeps its parent entry (employer or project) so a
 * tailored CV can be rebuilt from ids alone, and so the validator knows which
 * names and keywords are verified for that highlight.
 */

import type { Resume } from "../../data/resume.schema";
import type { Lang } from "../../i18n/locales";
import { PROFILE_SUMMARY_ID } from "./config";

export const CATALOG_SECTIONS = ["work", "projects"] as const;

export type CatalogSection = (typeof CATALOG_SECTIONS)[number];

export interface CatalogItem {
  readonly id: string;
  readonly section: CatalogSection;
  /** Position of the parent entry in `resume.work` or `resume.projects`. */
  readonly entryIndex: number;
  /** Employer or project name. */
  readonly entry: string;
  readonly text: string;
  /** Verified names for this highlight besides its own text: entry name, project keywords. */
  readonly entryTerms: readonly string[];
}

export interface Catalog {
  readonly lang: Lang;
  readonly items: readonly CatalogItem[];
  readonly byId: ReadonlyMap<string, CatalogItem>;
  /** Highlight ids in document order (work first, then projects). */
  readonly ids: readonly string[];
  readonly profileSummary: string | undefined;
  /** Skill group names and keywords: verified for the summary only. */
  readonly skillTerms: readonly string[];
  /** The one-line label under the name. */
  readonly label: string;
}

/** Builds the catalog of one locale's resume. */
export function buildCatalog(resume: Resume, lang: Lang): Catalog {
  const items: CatalogItem[] = [];

  resume.work.forEach((job, entryIndex) => {
    for (const highlight of job.highlights) {
      items.push({
        id: highlight.id,
        section: "work",
        entryIndex,
        entry: job.name,
        text: highlight.text,
        entryTerms: [job.name, job.position],
      });
    }
  });

  resume.projects.forEach((project, entryIndex) => {
    for (const highlight of project.highlights) {
      items.push({
        id: highlight.id,
        section: "projects",
        entryIndex,
        entry: project.name,
        text: highlight.text,
        entryTerms: [project.name, ...project.keywords],
      });
    }
  });

  return {
    lang,
    items,
    byId: new Map(items.map((item) => [item.id, item])),
    ids: items.map((item) => item.id),
    profileSummary: resume.basics.summary,
    skillTerms: resume.skills.flatMap((skill) => [skill.name, ...skill.keywords]),
    label: resume.basics.label,
  };
}

/** Ids the summary may cite: every highlight, plus the profile summary when there is one. */
export function summarySourceIds(catalog: Catalog): string[] {
  return catalog.profileSummary ? [...catalog.ids, PROFILE_SUMMARY_ID] : [...catalog.ids];
}

/** Text behind a summary source id, or undefined for an unknown id. */
export function sourceText(catalog: Catalog, id: string): string | undefined {
  if (id === PROFILE_SUMMARY_ID) return catalog.profileSummary;
  return catalog.byId.get(id)?.text;
}
