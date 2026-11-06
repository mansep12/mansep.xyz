/**
 * Helpers for build steps that read the generated site in dist/client
 * (Open Graph images, security headers, link checker). Node only.
 *
 * With `build.format: "preserve"`, `sobre-mi.astro` builds to
 * `sobre-mi.html` (served at `/sobre-mi`) and `en/index.astro` to
 * `en/index.html` (served at `/en/`).
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export interface BuiltPage {
  /** Path relative to the output directory, with forward slashes. */
  readonly file: string;
  /** URL path the page is served at, e.g. `/sobre-mi` or `/en/`. */
  readonly path: string;
  readonly html: string;
}

/** URL path of a built HTML file, e.g. `en/index.html` gives `/en/`. */
export function pagePathFromFile(file: string): string {
  const path = `/${file.replace(/\.html$/, "")}`;
  return path.endsWith("/index") ? path.slice(0, -"index".length) : path;
}

/**
 * Files that could answer a URL path on Cloudflare static assets, most
 * specific first: the path itself, then `<path>.html` or `<path>/index.html`.
 */
export function filesForPath(pathname: string): string[] {
  const path = decodeURIComponent(pathname).replace(/^\//, "");
  if (path === "" || path.endsWith("/")) return [`${path}index.html`];
  return [path, `${path}.html`];
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : Promise.resolve([full]);
    }),
  );
  return nested.flat();
}

/** Every file under `dir`, relative to it, with forward slashes, sorted. */
export async function listFiles(dir: string): Promise<string[]> {
  const files = await walk(dir);
  return files.map((file) => relative(dir, file).split(sep).join("/")).sort();
}

/** Every HTML page under `dir` with its URL path and contents. */
export async function readBuiltPages(dir: string): Promise<BuiltPage[]> {
  const files = (await listFiles(dir)).filter((file) => file.endsWith(".html"));
  return Promise.all(
    files.map(async (file) => ({
      file,
      path: pagePathFromFile(file),
      html: await readFile(join(dir, file), "utf8"),
    })),
  );
}
