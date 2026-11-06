/**
 * Route map: each logical page has one path pattern per locale.
 * Patterns use Astro's `[param]` syntax; both locales of a route must declare
 * the same params.
 *
 * Paths without a trailing slash are built as `<name>.html` (Astro
 * `build.format: "preserve"`), which is how Cloudflare static assets serve
 * them without a redirect. Create `src/pages/proyectos.astro`, not
 * `src/pages/proyectos/index.astro`.
 */

import { site } from "../data/site";
import { defaultLang, isLang, type Lang, locales } from "./locales";

export const routes = {
  home: { es: "/", en: "/en/" },
  projects: { es: "/proyectos", en: "/en/projects" },
  project: { es: "/proyectos/[slug]", en: "/en/projects/[slug]" },
  research: { es: "/investigacion", en: "/en/research" },
  about: { es: "/sobre-mi", en: "/en/about" },
  cv: { es: "/cv", en: "/en/cv" },
  privacy: { es: "/privacidad", en: "/en/privacy" },
  colophon: { es: "/colofon", en: "/en/colophon" },
} as const satisfies Record<string, Record<Lang, string>>;

export type RouteKey = keyof typeof routes;

type ParamNames<P extends string> = P extends `${string}[${infer Name}]${infer Rest}`
  ? Name | ParamNames<Rest>
  : never;

/** Param names declared by a route, e.g. `"slug"` for `project`. */
export type RouteParamName<K extends RouteKey> = ParamNames<(typeof routes)[K][Lang]>;

/** Params object for a route, or `undefined` when the route has none. */
export type RouteParams<K extends RouteKey> = K extends RouteKey
  ? [RouteParamName<K>] extends [never]
    ? undefined
    : Readonly<Record<RouteParamName<K>, string>>
  : never;

/**
 * Trailing argument of the helpers: required for routes with params,
 * absent for routes without, optional when `K` is the whole `RouteKey` union.
 */
export type RouteParamsArg<K extends RouteKey> = [RouteParams<K>] extends [undefined]
  ? [params?: undefined]
  : undefined extends RouteParams<K>
    ? [params?: RouteParams<K>]
    : [params: RouteParams<K>];

/**
 * A route plus its params, as a discriminated union on `routeKey`.
 * Used by components (e.g. the base layout) that receive a route as props.
 */
export type RouteTarget = {
  [K in RouteKey]: RouteParams<K> extends undefined
    ? { routeKey: K; params?: undefined }
    : { routeKey: K; params: RouteParams<K> };
}[RouteKey];

/**
 * The route of a rendered page: a route from the map, or none for a page
 * outside it (such as the 404 page), which gets no canonical URL, no
 * hreflang alternates and no language switch.
 */
export type PageRoute = RouteTarget | { routeKey?: undefined; params?: undefined };

const PARAM_PATTERN = /\[([^\]]+)\]/g;

/** Site-relative path of a route in a locale, e.g. `/en/projects/nodus`. */
export function localizedPath<K extends RouteKey>(
  key: K,
  lang: Lang,
  ...[params]: RouteParamsArg<K>
): string {
  const pattern: string = routes[key][lang];
  const values: Readonly<Record<string, string>> = params ?? {};
  return pattern.replace(PARAM_PATTERN, (_, name: string) => {
    const value = values[name];
    if (!value) {
      throw new Error(`Missing param "${name}" for route "${key}"`);
    }
    return encodeURIComponent(value);
  });
}

/** Absolute URL for a site-relative path or an already absolute URL. */
export function absoluteUrl(path: string): string {
  return new URL(path, site.url).href;
}

/** Absolute URL of a route in every locale. */
export function alternates<K extends RouteKey>(
  key: K,
  ...args: RouteParamsArg<K>
): Record<Lang, string> {
  const entries = locales.map((lang) => [lang, absoluteUrl(localizedPath(key, lang, ...args))]);
  return Object.fromEntries(entries) as Record<Lang, string>;
}

export interface AlternateLink {
  readonly hreflang: string;
  readonly href: string;
}

/**
 * `hreflang` links for a route: one per locale plus `x-default`, which
 * points to the default locale. Every version must list all of them.
 */
export function alternateLinks<K extends RouteKey>(
  key: K,
  ...args: RouteParamsArg<K>
): AlternateLink[] {
  const urls = alternates(key, ...args);
  return [
    ...locales.map((lang) => ({ hreflang: lang, href: urls[lang] })),
    { hreflang: "x-default", href: urls[defaultLang] },
  ];
}

/** Locale of a URL or path: the first path segment if it names a locale, else the default. */
export function getLangFromUrl(url: URL | string): Lang {
  const { pathname } = typeof url === "string" ? new URL(url, site.url) : url;
  const [, segment] = pathname.split("/");
  return isLang(segment) ? segment : defaultLang;
}

export interface RouteMatch {
  readonly route: RouteTarget;
  readonly lang: Lang;
}

function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split(PARAM_PATTERN)
    .map((part, index) =>
      // split() with a capture group alternates literal text and param names.
      index % 2 === 1 ? `(?<${part}>[^/]+)` : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("");
  return new RegExp(`^${source}$`);
}

const routeMatchers = (Object.keys(routes) as RouteKey[]).flatMap((key) =>
  locales.map((lang) => ({ key, lang, regexp: patternToRegExp(routes[key][lang]) })),
);

/**
 * The route and locale of a site-relative path, e.g. `/en/projects/nodus`
 * gives `{ route: { routeKey: "project", params: { slug: "nodus" } }, lang: "en" }`.
 * Returns `undefined` for a path outside the route map (such as /404).
 * Inverse of `localizedPath`.
 */
export function matchRoute(pathname: string): RouteMatch | undefined {
  for (const { key, lang, regexp } of routeMatchers) {
    const match = regexp.exec(pathname);
    if (!match) continue;
    const groups = match.groups ?? {};
    const params = Object.fromEntries(
      Object.entries(groups).map(([name, value]) => [name, decodeURIComponent(value)]),
    );
    const route = (
      Object.keys(params).length > 0 ? { routeKey: key, params } : { routeKey: key }
    ) as RouteTarget;
    return { route, lang };
  }
  return undefined;
}
