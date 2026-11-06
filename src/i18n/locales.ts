/**
 * Supported locales. Spanish is the default and lives at the root;
 * English lives under /en/. Astro's i18n config reads from here too.
 */

export const locales = ["es", "en"] as const;

export type Lang = (typeof locales)[number];

export const defaultLang: Lang = "es";

export interface LocaleInfo {
  /** Name of the language in that language, for the language switcher. */
  readonly label: string;
  /** BCP 47 tag for `<html lang>` and `hreflang`. */
  readonly tag: string;
  /** Open Graph locale (`og:locale`). */
  readonly ogLocale: string;
}

export const localeInfo = {
  es: { label: "Español", tag: "es", ogLocale: "es_CL" },
  en: { label: "English", tag: "en", ogLocale: "en_US" },
} as const satisfies Record<Lang, LocaleInfo>;

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Every locale except `lang`, in declaration order. */
export function otherLangs(lang: Lang): Lang[] {
  return locales.filter((l) => l !== lang);
}
