/**
 * UI strings and the es/en route map.
 * Spanish is the default locale and lives at the root; English lives under /en/.
 */

export const languages = {
  es: "Español",
  en: "English",
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = "es";

export const ui = {
  es: {
    "site.tagline": "Software engineer · backend, applied cryptography and security",
    "site.status": "Sitio en construcción",
  },
  en: {
    "site.tagline": "Software engineer · backend, applied cryptography and security",
    "site.status": "Site under construction",
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type UiKey = keyof (typeof ui)[typeof defaultLang];

export function t(lang: Lang, key: UiKey): string {
  return ui[lang][key];
}

/**
 * Route map: each logical page has one path per locale.
 * Stub for now; more routes (projects, research, about, cv...) come later.
 */
export const routes = {
  home: { es: "/", en: "/en/" },
} as const satisfies Record<string, Record<Lang, string>>;

export type RouteKey = keyof typeof routes;

export function pathFor(route: RouteKey, lang: Lang): string {
  return routes[route][lang];
}
