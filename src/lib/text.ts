/** Small text helpers for visible copy. */

import type { Lang } from "../i18n/locales";

/** "a, b y c" / "a, b, and c", with the first letter of each item lowercased. */
export function joinLowercase(items: readonly string[], lang: Lang): string {
  const lowered = items.map((item) => item.charAt(0).toLocaleLowerCase(lang) + item.slice(1));
  return new Intl.ListFormat(lang, { type: "conjunction" }).format(lowered);
}
