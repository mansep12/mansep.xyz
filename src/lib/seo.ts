/**
 * Document titles and social preview images, shared by the base layout
 * (which writes the tags) and the Open Graph integration (which reads the
 * built pages and renders the images).
 */

import { site } from "../data/site";

/** Separator between the page title and the site name in `<title>`. */
const TITLE_SEPARATOR = " · ";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** `<title>` of a page: the page title and the site name, or the name alone on the home page. */
export function documentTitle(title: string, isHome: boolean): string {
  return isHome ? site.name : `${title}${TITLE_SEPARATOR}${site.name}`;
}

/** The page title inside a document title (inverse of `documentTitle`). */
export function pageTitle(fullTitle: string): string {
  const suffix = `${TITLE_SEPARATOR}${site.name}`;
  return fullTitle.endsWith(suffix) ? fullTitle.slice(0, -suffix.length) : fullTitle;
}

/**
 * Site-relative path of the generated preview image of a page:
 * `/` gives `/og/index.png`, `/en/` gives `/og/en/index.png` and
 * `/proyectos/nodus` gives `/og/proyectos/nodus.png`.
 */
export function ogImagePath(pagePath: string): string {
  const path = pagePath.endsWith("/") ? `${pagePath}index` : pagePath;
  return `/og${path}.png`;
}
