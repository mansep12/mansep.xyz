/**
 * Read helpers for the localized collections. Pages should use these instead
 * of calling getCollection directly, so locale filtering and ordering live in
 * one place.
 */

import { type CollectionEntry, getCollection, getEntry } from "astro:content";
import type { Resume } from "../../data/resume.schema";
import { type Lang, otherLangs } from "../../i18n/locales";
import { parseEntryId } from "./entry-id";

export { entryId, parseEntryId } from "./entry-id";

export type LocalizedCollection = "projects" | "research";
export type ProjectEntry = CollectionEntry<"projects">;
export type ResearchEntry = CollectionEntry<"research">;

/** Locale of an entry, from its `<lang>/` folder. */
export function entryLang(entry: { id: string }): Lang {
  return parseEntryId(entry.id).lang;
}

/** Slug of an entry, from its file name. Shared by both locales. */
export function entrySlug(entry: { id: string }): string {
  return parseEntryId(entry.id).slug;
}

/** Every entry of a localized collection in one locale, unsorted. */
export async function getEntriesByLocale<C extends LocalizedCollection>(
  collection: C,
  lang: Lang,
): Promise<CollectionEntry<C>[]> {
  const entries: CollectionEntry<C>[] = await getCollection(collection);
  return entries.filter((entry) => entryLang(entry) === lang);
}

/**
 * The same entry in another locale (by default the other one), or
 * `undefined` if it has not been translated.
 */
export async function findCounterpart<C extends LocalizedCollection>(
  collection: C,
  entry: CollectionEntry<C>,
  lang: Lang = otherLangs(entryLang(entry))[0],
): Promise<CollectionEntry<C> | undefined> {
  const slug = entrySlug(entry);
  const entries = await getEntriesByLocale(collection, lang);
  return entries.find((candidate) => entrySlug(candidate) === slug);
}

/** Projects in one locale, by `order` ascending. */
export async function getProjects(lang: Lang): Promise<ProjectEntry[]> {
  const projects = await getEntriesByLocale("projects", lang);
  return projects.sort((a, b) => a.data.order - b.data.order);
}

/** Research entries in one locale, newest first. */
export async function getResearch(lang: Lang): Promise<ResearchEntry[]> {
  const research = await getEntriesByLocale("research", lang);
  return research.sort(
    (a, b) => b.data.year.localeCompare(a.data.year) || a.data.title.localeCompare(b.data.title),
  );
}

/** Validated CV data for one locale. */
export async function getResume(lang: Lang): Promise<Resume> {
  const entry = await getEntry("resume", lang);
  if (!entry) {
    throw new Error(`Missing resume for locale "${lang}"`);
  }
  const { id: _id, ...resume } = entry.data;
  return resume;
}
