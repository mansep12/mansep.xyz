/**
 * Ids of localized collection entries. A file at `<collection>/<lang>/<slug>.md`
 * gets the id `<lang>/<slug>`, so the same slug can exist once per locale.
 */

import { isLang, type Lang } from "../../i18n/locales";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface LocalizedId {
  readonly lang: Lang;
  readonly slug: string;
}

export function parseEntryId(id: string): LocalizedId {
  const [lang, slug, ...rest] = id.split("/");
  if (!isLang(lang) || !slug || rest.length > 0 || !SLUG.test(slug)) {
    throw new Error(
      `Invalid localized entry "${id}": expected <lang>/<slug> with a lowercase kebab-case slug`,
    );
  }
  return { lang, slug };
}

export function entryId(lang: Lang, slug: string): string {
  return `${lang}/${slug}`;
}

/** Id for a glob loader entry path such as `es/nodus.md`. */
export function entryIdFromPath(path: string): string {
  const id = path.replace(/\.(md|mdx)$/, "");
  parseEntryId(id);
  return id;
}
