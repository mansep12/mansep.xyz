/**
 * Builds the tailored resume from a validated selection. Only highlights and
 * the summary come from the selection; everything else (name, contact,
 * employers, positions, dates, projects, links, education, skills) is
 * copied from the verified resume, so the model never touches it.
 */

import type { Resume } from "../../data/resume.schema";
import { CATALOG_SECTIONS, type CatalogSection } from "./catalog";
import type { ValidatedSelection } from "./validate";

export interface TailoredResume {
  resume: Resume;
  /** Order of the work and projects sections in the document. */
  sectionOrder: CatalogSection[];
}

export function tailorResume(resume: Resume, selection: ValidatedSelection): TailoredResume {
  const selected = new Map<string, { text: string; rank: number }>();
  let rank = 0;
  for (const section of selection.sections) {
    for (const item of section.items) selected.set(item.id, { text: item.text, rank: rank++ });
  }

  const pick = (highlights: Resume["work"][number]["highlights"]) =>
    highlights
      .filter((highlight) => selected.has(highlight.id))
      .map((highlight) => ({ id: highlight.id, text: selected.get(highlight.id)?.text ?? "" }))
      .sort((a, b) => (selected.get(a.id)?.rank ?? 0) - (selected.get(b.id)?.rank ?? 0));

  const firstRank = (highlights: { id: string }[]) =>
    Math.min(...highlights.map((highlight) => selected.get(highlight.id)?.rank ?? Infinity));

  // Every job stays, in chronological order, so the history has no gaps;
  // only its highlights are filtered. Projects without a selected highlight
  // are left out, and the rest go by relevance.
  const work = resume.work.map((job) => ({ ...job, highlights: pick(job.highlights) }));
  const projects = resume.projects
    .map((project) => ({ ...project, highlights: pick(project.highlights) }))
    .filter((project) => project.highlights.length > 0)
    .sort((a, b) => firstRank(a.highlights) - firstRank(b.highlights));

  const lead = selection.sections.map((section) => section.section);
  const sectionOrder = [...lead, ...CATALOG_SECTIONS.filter((section) => !lead.includes(section))];

  return {
    resume: {
      ...resume,
      basics: { ...resume.basics, summary: selection.summary.text || resume.basics.summary },
      work,
      // Not rendered by <CvDocument>; dropped so nothing unselected leaks into the JSON.
      volunteer: [],
      projects,
    },
    sectionOrder,
  };
}
