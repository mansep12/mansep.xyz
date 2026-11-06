/**
 * Checks the built site in dist/client for broken internal references:
 * links, assets, #fragments, canonical and hreflang targets (and that
 * alternates point back), social images, the sitemap and robots.txt.
 * External links are not fetched.
 *
 *   bun run check:links            # after bun run build
 *   bun scripts/check-links.ts <dir>
 *
 * Exits with status 1 and one line per problem when anything is broken.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type HTMLElement, parse } from "node-html-parser";
import { site } from "../src/data/site";
import { filesForPath, listFiles, readBuiltPages } from "../src/integrations/built-pages";

/** Attributes that hold one URL, by selector. */
const URL_ATTRIBUTES = [
  ["a[href]", "href"],
  ["link[href]", "href"],
  ["script[src]", "src"],
  ["img[src]", "src"],
  ["iframe[src]", "src"],
  ["source[src]", "src"],
  ["video[poster]", "poster"],
  ["form[action]", "action"],
  ['meta[property="og:image"]', "content"],
  ['meta[property="og:url"]', "content"],
  ['meta[name="twitter:image"]', "content"],
] as const;

const SRCSET_SELECTOR = "img[srcset], source[srcset]";

interface Page {
  readonly file: string;
  readonly url: string;
  readonly root: HTMLElement;
  readonly ids: ReadonlySet<string>;
}

export interface LinkReport {
  readonly problems: string[];
  /** Internal references checked. */
  readonly checked: number;
  /** External references skipped. */
  readonly external: number;
}

function srcsetUrls(value: string): string[] {
  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? "")
    .filter(Boolean);
}

/** Every attribute URL of a page, with a label for the report. */
function references(root: HTMLElement): { label: string; value: string }[] {
  const found: { label: string; value: string }[] = [];
  for (const [selector, attribute] of URL_ATTRIBUTES) {
    for (const element of root.querySelectorAll(selector)) {
      const value = element.getAttribute(attribute);
      if (value !== undefined) found.push({ label: `<${element.rawTagName} ${attribute}>`, value });
    }
  }
  for (const element of root.querySelectorAll(SRCSET_SELECTOR)) {
    for (const value of srcsetUrls(element.getAttribute("srcset") ?? "")) {
      found.push({ label: `<${element.rawTagName} srcset>`, value });
    }
  }
  return found;
}

export async function checkLinks(dir: string): Promise<LinkReport> {
  const files = new Set(await listFiles(dir));
  const pages = new Map<string, Page>();
  for (const built of await readBuiltPages(dir)) {
    const root = parse(built.html);
    const ids = new Set(
      root
        .querySelectorAll("[id], a[name]")
        .map((element) => element.getAttribute("id") ?? element.getAttribute("name") ?? ""),
    );
    const url = new URL(built.path, site.url).href;
    pages.set(url, { file: built.file, url, root, ids });
  }

  const problems: string[] = [];
  let checked = 0;
  let external = 0;

  /** The file a site URL resolves to, or a reason it does not. */
  function resolveTarget(url: URL): { file?: string; reason?: string } {
    if (/\/index(\.html)?$/.test(url.pathname) || url.pathname.endsWith(".html")) {
      return { reason: "link to the clean URL (Cloudflare redirects .html and /index)" };
    }
    const file = filesForPath(url.pathname).find((candidate) => files.has(candidate));
    if (file) return { file };
    if (files.has(`${url.pathname.slice(1)}/index.html`)) {
      return { reason: `missing trailing slash (redirects to ${url.pathname}/)` };
    }
    return { reason: "no such file" };
  }

  /** Checks one reference found in `source` (a file name), relative to `base`. */
  function checkReference(source: string, base: string, label: string, value: string): void {
    let url: URL;
    try {
      url = new URL(value, base);
    } catch {
      problems.push(`${source}: ${label} invalid URL "${value}"`);
      return;
    }
    if (url.origin !== site.url) {
      if (url.protocol === "http:" || url.protocol === "https:") external++;
      return;
    }
    checked++;
    const { file, reason } = resolveTarget(url);
    if (!file) {
      problems.push(`${source}: ${label} ${url.pathname}: ${reason}`);
      return;
    }
    const fragment = decodeURIComponent(url.hash.slice(1));
    if (fragment && file.endsWith(".html")) {
      const target = pages.get(new URL(url.pathname, site.url).href);
      if (target && !target.ids.has(fragment)) {
        problems.push(`${source}: ${label} ${url.pathname}#${fragment}: no element with that id`);
      }
    }
  }

  for (const page of pages.values()) {
    for (const { label, value } of references(page.root)) {
      checkReference(page.file, page.url, label, value);
    }

    const canonical = page.root.querySelector('link[rel="canonical"]')?.getAttribute("href");
    if (canonical && canonical !== page.url) {
      problems.push(`${page.file}: canonical ${canonical} is not the page's own URL ${page.url}`);
    }

    // Each alternate must list this page back (hreflang links are bidirectional).
    for (const link of page.root.querySelectorAll('link[rel="alternate"][hreflang]')) {
      const href = link.getAttribute("href") ?? "";
      const lang = link.getAttribute("hreflang");
      const target = pages.get(href);
      if (!target || href === page.url || lang === "x-default") continue;
      const back = target.root
        .querySelectorAll('link[rel="alternate"][hreflang]')
        .some((other) => other.getAttribute("href") === page.url);
      if (!back) problems.push(`${page.file}: hreflang ${lang} ${href} does not link back`);
    }
  }

  // Sitemaps: every listed URL and alternate must exist.
  for (const file of [...files].filter((name) => /^sitemap.*\.xml$/.test(name))) {
    const xml = await readFile(join(dir, file), "utf8");
    for (const [, loc = ""] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      checkReference(file, site.url, "<loc>", loc);
    }
    for (const [, href = ""] of xml.matchAll(/<xhtml:link [^>]*href="([^"]+)"/g)) {
      checkReference(file, site.url, "<xhtml:link>", href);
    }
  }
  if (files.has("robots.txt")) {
    const robots = await readFile(join(dir, "robots.txt"), "utf8");
    for (const [, url = ""] of robots.matchAll(/^Sitemap:\s*(\S+)/gim)) {
      checkReference("robots.txt", site.url, "Sitemap:", url);
    }
  }

  return { problems, checked, external };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const dir = resolve(process.argv[2] ?? "dist/client");
  if (!existsSync(dir)) {
    console.error(`${dir} does not exist; run bun run build first.`);
    process.exit(1);
  }
  const report = await checkLinks(dir);
  for (const problem of report.problems) console.error(problem);
  const summary = `${report.checked} internal references checked, ${report.external} external skipped`;
  if (report.problems.length > 0) {
    console.error(`\n${report.problems.length} broken references (${summary}).`);
    process.exit(1);
  }
  console.log(`No broken links: ${summary}.`);
}
