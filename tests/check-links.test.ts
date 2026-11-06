import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkLinks } from "../scripts/check-links";

const page = (head: string, body: string) =>
  `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

const site = {
  "index.html": page(
    '<link rel="canonical" href="https://mansep.xyz/">' +
      '<link rel="alternate" hreflang="en" href="https://mansep.xyz/en/">' +
      '<meta property="og:image" content="https://mansep.xyz/og/index.png">',
    '<a href="#main">skip</a><main id="main"></main>' +
      '<a href="/sobre-mi">ok</a><a href="/sobre-mi#bio">ok</a><a href="https://github.com/x">ext</a>' +
      '<a href="/missing">broken</a><a href="/sobre-mi#nope">bad fragment</a>' +
      '<a href="/en">no slash</a><a href="/sobre-mi.html">html</a><img src="/_astro/a.webp" alt="">',
  ),
  "en/index.html": page(
    '<link rel="canonical" href="https://mansep.xyz/en/">' +
      '<link rel="alternate" hreflang="es" href="https://mansep.xyz/sobre-mi">',
    "",
  ),
  "sobre-mi.html": page(
    '<link rel="canonical" href="https://mansep.xyz/about">',
    '<p id="bio"></p>',
  ),
  "og/index.png": "png",
  "robots.txt": "User-agent: *\nAllow: /\n\nSitemap: https://mansep.xyz/sitemap-index.xml\n",
  "sitemap-index.xml":
    "<sitemapindex><sitemap><loc>https://mansep.xyz/sitemap-0.xml</loc></sitemap></sitemapindex>",
  "sitemap-0.xml":
    '<urlset><url><loc>https://mansep.xyz/</loc><xhtml:link rel="alternate" hreflang="en" href="https://mansep.xyz/gone"/></url></urlset>',
};

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "check-links-"));
  for (const [file, content] of Object.entries(site)) {
    await mkdir(dirname(join(dir, file)), { recursive: true });
    await writeFile(join(dir, file), content);
  }
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("checkLinks", () => {
  it("reports each kind of broken reference", async () => {
    const report = await checkLinks(dir);
    expect(report.problems).toEqual([
      "en/index.html: hreflang es https://mansep.xyz/sobre-mi does not link back",
      "index.html: <a href> /missing: no such file",
      "index.html: <a href> /sobre-mi#nope: no element with that id",
      "index.html: <a href> /en: missing trailing slash (redirects to /en/)",
      "index.html: <a href> /sobre-mi.html: link to the clean URL (Cloudflare redirects .html and /index)",
      "index.html: <img src> /_astro/a.webp: no such file",
      "index.html: hreflang en https://mansep.xyz/en/ does not link back",
      "sobre-mi.html: <link href> /about: no such file",
      "sobre-mi.html: canonical https://mansep.xyz/about is not the page's own URL https://mansep.xyz/sobre-mi",
      "sitemap-0.xml: <xhtml:link> /gone: no such file",
    ]);
    expect(report.external).toBe(1);
  });
});
