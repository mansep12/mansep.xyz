/**
 * hreflang alternates for the sitemap, from the route map.
 *
 * @astrojs/sitemap has an `i18n` option, but it pairs URLs that share the
 * same path after the locale prefix (`/cv` and `/en/cv`). Most routes here
 * are translated (`/proyectos` and `/en/projects`), so the pairs come from
 * src/i18n/routes.ts instead, the same map the layout uses for its
 * `<link rel="alternate" hreflang>` tags.
 */

import { absoluteUrl, alternateLinks, matchRoute } from "../i18n/routes";

export interface SitemapLink {
  /** Absolute URL of the alternate page. */
  readonly url: string;
  /** hreflang value: a locale tag or "x-default". */
  readonly lang: string;
}

/**
 * Canonical URL of a built page, or `undefined` for a page outside the
 * route map. Astro reports the English home as `/en`; its canonical URL is
 * `/en/` (Cloudflare redirects the former to the latter).
 */
export function canonicalPageUrl(url: string): string | undefined {
  const { pathname } = new URL(url);
  for (const candidate of [pathname, `${pathname}/`]) {
    if (matchRoute(candidate)) return absoluteUrl(candidate);
  }
  return undefined;
}

/**
 * Alternates of a page for its sitemap entry, matching the page's hreflang
 * links: one per locale plus x-default. Returns `undefined` for a page
 * outside the route map or one whose other locale versions are not all in
 * `pageUrls` (an untranslated page lists no alternates, as in its HTML).
 */
export function sitemapLinks(
  url: string,
  pageUrls: ReadonlySet<string>,
): SitemapLink[] | undefined {
  const match = matchRoute(new URL(url).pathname);
  if (!match) return undefined;
  const links = alternateLinks(match.route.routeKey, match.route.params);
  if (!links.every((link) => pageUrls.has(link.href))) return undefined;
  return links.map(({ hreflang, href }) => ({ url: href, lang: hreflang }));
}
