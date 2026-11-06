import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { loadResumes, resumeEntrySchema } from "./data/resume.schema";
import { locales } from "./i18n/locales";
import { entryIdFromPath } from "./lib/content/entry-id";
import { pageSchema, projectSchema, researchSchema } from "./lib/content/schemas";

/** Markdown at `src/content/<name>/<lang>/<slug>.md`, with id `<lang>/<slug>`. */
function localizedMarkdown(name: string) {
  return glob({
    base: `./src/content/${name}`,
    pattern: `{${locales.join(",")}}/*.md`,
    generateId: ({ entry }) => entryIdFromPath(entry),
  });
}

const projects = defineCollection({
  loader: localizedMarkdown("projects"),
  schema: projectSchema,
});

const research = defineCollection({
  loader: localizedMarkdown("research"),
  schema: researchSchema,
});

/** Long page prose (about, privacy, colophon), one file per page and locale. */
const pages = defineCollection({
  loader: localizedMarkdown("pages"),
  schema: pageSchema,
});

/** CV data from src/data/resume.{es,en}.json, one entry per locale. */
const resume = defineCollection({
  loader: async () => {
    const resumes = loadResumes();
    return locales.map((lang) => ({ id: lang, ...resumes[lang] }));
  },
  schema: resumeEntrySchema,
});

export const collections = { projects, research, pages, resume };
