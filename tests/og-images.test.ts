import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ogJobsFromHtml, readPaperPalette, renderOgImage } from "../src/integrations/og-images";
import { parseColorTokens } from "../src/lib/color-tokens";
import { documentTitle, ogImagePath, pageTitle } from "../src/lib/seo";
import { themeColors } from "../src/lib/theme";

describe("ogImagePath", () => {
  it("maps page paths to PNGs under /og/", () => {
    expect(ogImagePath("/")).toBe("/og/index.png");
    expect(ogImagePath("/en/")).toBe("/og/en/index.png");
    expect(ogImagePath("/sobre-mi")).toBe("/og/sobre-mi.png");
    expect(ogImagePath("/en/projects/nodus")).toBe("/og/en/projects/nodus.png");
  });
});

describe("document titles", () => {
  it("round-trips the page title", () => {
    expect(documentTitle("Sobre mí", false)).toBe("Sobre mí · Manuel Sepúlveda");
    expect(pageTitle(documentTitle("Sobre mí", false))).toBe("Sobre mí");
    expect(documentTitle("ignored", true)).toBe("Manuel Sepúlveda");
  });
});

describe("color tokens", () => {
  it("keeps the theme-color values in sync with --color-bg", async () => {
    const tokens = parseColorTokens(
      await readFile(new URL("../src/styles/tokens.css", import.meta.url), "utf8"),
    );
    expect(tokens.bg).toEqual(themeColors);
  });
});

function page(head: string) {
  return { path: "/sobre-mi", html: `<!doctype html><html lang="es"><head>${head}</head></html>` };
}

describe("ogJobsFromHtml", () => {
  const canonical = '<link rel="canonical" href="https://mansep.xyz/sobre-mi">';
  const title = '<meta property="og:title" content="Sobre mí · Manuel Sepúlveda">';

  it("renders a card for a page that uses its generated image", () => {
    const job = ogJobsFromHtml(
      page(
        `${canonical}${title}<meta property="og:image" content="https://mansep.xyz/og/sobre-mi.png">`,
      ),
    );
    expect(job).toEqual({
      output: "/og/sobre-mi.png",
      card: { title: "Sobre mí", subtitle: undefined, path: "/sobre-mi", locale: "ES" },
    });
  });

  it("skips pages with an explicit image or no canonical URL", () => {
    const custom = '<meta property="og:image" content="https://mansep.xyz/images/custom.png">';
    expect(ogJobsFromHtml(page(`${canonical}${title}${custom}`))).toBeUndefined();
    expect(ogJobsFromHtml(page(title))).toBeUndefined();
  });
});

describe("renderOgImage", () => {
  it("produces a 1200x630 PNG", async () => {
    const png = await renderOgImage(
      { title: "Sobre mí", path: "/sobre-mi", locale: "ES" },
      await readPaperPalette(),
    );
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});

describe("favicon", () => {
  it("uses only colors from tokens.css", async () => {
    const tokens = parseColorTokens(
      await readFile(new URL("../src/styles/tokens.css", import.meta.url), "utf8"),
    );
    const palette = new Set(Object.values(tokens).flatMap(({ light, dark }) => [light, dark]));
    const svg = await readFile(new URL("../public/favicon.svg", import.meta.url), "utf8");
    const colors = svg.match(/#[0-9a-f]{6}\b/gi) ?? [];
    expect(colors.length).toBeGreaterThan(0);
    for (const color of colors) expect(palette).toContain(color.toLowerCase());
  });
});
