/**
 * Open Graph images, one PNG per page and locale, rendered at build time in
 * Node (never in the Workers prerender runtime) with Satori and resvg.
 *
 * The built HTML is the source: for every page whose `og:image` is its own
 * generated path (see `ogImagePath` in src/lib/seo.ts, which the layout uses
 * by default), the card shows the page title from `og:title` and is written
 * to dist/client/og/<path>.png. A page that sets `ogImage` explicitly points
 * elsewhere and gets no generated card.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import type { AstroIntegration } from "astro";
import { parse } from "node-html-parser";
import satori from "satori";
import { site } from "../data/site";
import { colorToken, parseColorTokens } from "../lib/color-tokens";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, ogImagePath, pageTitle } from "../lib/seo";
import { readBuiltPages } from "./built-pages";

const require = createRequire(import.meta.url);

export interface OgCard {
  /** Main line: the page title (the site name on the home page). */
  readonly title: string;
  /** Optional second line under the title. */
  readonly subtitle?: string;
  /** URL path of the page, shown after the domain. */
  readonly path: string;
  /** Uppercase locale code shown in the corner, e.g. "ES". */
  readonly locale: string;
}

export interface OgPalette {
  readonly bg: string;
  readonly text: string;
  readonly muted: string;
  readonly border: string;
  readonly accent: string;
  readonly highlight: string;
}

/** The light ("paper") values of the color tokens. */
export async function readPaperPalette(
  tokensFile = fileURLToPath(new URL("../styles/tokens.css", import.meta.url)),
): Promise<OgPalette> {
  const tokens = parseColorTokens(await readFile(tokensFile, "utf8"));
  const light = (name: string) => colorToken(tokens, name).light;
  return {
    bg: light("bg"),
    text: light("text"),
    muted: light("muted"),
    border: light("border"),
    accent: light("accent"),
    highlight: light("highlight"),
  };
}

type FontWeight = 400 | 500 | 600;

interface FontSpec {
  readonly name: string;
  readonly file: string;
  readonly weight: FontWeight;
}

// Satori reads TTF, OTF and WOFF, not WOFF2: use Fontsource's .woff files.
const FONT_SPECS: readonly FontSpec[] = [
  {
    name: "Plex Sans",
    file: "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff",
    weight: 400,
  },
  {
    name: "Plex Sans",
    file: "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff",
    weight: 600,
  },
  {
    name: "Plex Mono",
    file: "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff",
    weight: 400,
  },
];

let fontsPromise: Promise<{ name: string; data: Buffer; weight: FontWeight; style: "normal" }[]>;

function loadFonts() {
  fontsPromise ??= Promise.all(
    FONT_SPECS.map(async ({ name, file, weight }) => ({
      name,
      data: await readFile(require.resolve(file)),
      weight,
      style: "normal" as const,
    })),
  );
  return fontsPromise;
}

interface Node {
  type: string;
  props: { style?: Record<string, unknown>; children?: Node | string | (Node | string)[] };
}

function h(
  type: string,
  style: Record<string, unknown>,
  children?: Node | string | (Node | string)[],
): Node {
  return { type, props: { style, children } };
}

/** Smaller type for longer titles, so three lines always fit. */
function titleSize(title: string): number {
  if (title.length <= 24) return 76;
  if (title.length <= 48) return 64;
  return 52;
}

/** Three ledger nodes on a rule: the site's only ornament. */
function nodeMotif(palette: OgPalette): Node {
  const dot = (color: string, filled: boolean) =>
    h("div", {
      boxSizing: "border-box",
      width: 20,
      height: 20,
      borderRadius: "50%",
      border: `3px solid ${color}`,
      backgroundColor: filled ? color : palette.bg,
    });
  const link = h("div", { width: 44, height: 3, backgroundColor: palette.border });
  return h("div", { display: "flex", alignItems: "center" }, [
    dot(palette.border, false),
    link,
    dot(palette.accent, true),
    { ...link },
    dot(palette.highlight, false),
  ]);
}

export function ogCardTree(card: OgCard, palette: OgPalette): Node {
  const domain = new URL(site.url).host;
  const path = card.path === "/" ? "" : card.path.replace(/\/$/, "");
  return h(
    "div",
    {
      // Satori sizes boxes as content-box unless told otherwise.
      boxSizing: "border-box",
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "72px 80px 64px",
      backgroundColor: palette.bg,
      color: palette.text,
      fontFamily: "Plex Sans",
    },
    [
      h("div", { display: "flex", justifyContent: "space-between", alignItems: "center" }, [
        h("div", { fontSize: 32, fontWeight: 600 }, site.name),
        h("div", { fontFamily: "Plex Mono", fontSize: 24, color: palette.muted }, card.locale),
      ]),
      h("div", { display: "flex", flexDirection: "column", gap: 20 }, [
        h(
          "div",
          {
            fontSize: titleSize(card.title),
            fontWeight: 600,
            lineHeight: 1.12,
            letterSpacing: -1,
            lineClamp: 3,
          },
          card.title,
        ),
        ...(card.subtitle
          ? [h("div", { fontSize: 32, lineHeight: 1.35, color: palette.muted }, card.subtitle)]
          : []),
      ]),
      h(
        "div",
        {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 28,
          borderTop: `2px solid ${palette.border}`,
        },
        [
          h("div", { display: "flex", fontFamily: "Plex Mono", fontSize: 28 }, [
            h("span", { color: palette.text }, domain),
            h("span", { color: palette.muted }, path),
          ]),
          nodeMotif(palette),
        ],
      ),
    ],
  );
}

/** Renders a card to a 1200x630 PNG. */
export async function renderOgImage(card: OgCard, palette: OgPalette): Promise<Buffer> {
  const svg = await satori(ogCardTree(card, palette), {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    fonts: await loadFonts(),
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: OG_IMAGE_WIDTH } }).render().asPng();
  return Buffer.from(png);
}

interface OgJob {
  readonly output: string;
  readonly card: OgCard;
}

/** Cards to render: pages whose og:image is their own generated path. */
export function ogJobsFromHtml(page: { path: string; html: string }): OgJob | undefined {
  const root = parse(page.html);
  const meta = (property: string) =>
    root.querySelector(`meta[property="${property}"]`)?.getAttribute("content");
  const image = meta("og:image");
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href");
  if (!image || !canonical) return undefined;
  const pagePath = new URL(canonical).pathname;
  const imageUrl = new URL(image);
  if (imageUrl.origin !== site.url || imageUrl.pathname !== ogImagePath(pagePath)) {
    return undefined;
  }
  const isHome = pagePath === "/" || pagePath === "/en/";
  const lang = root.querySelector("html")?.getAttribute("lang") ?? "";
  return {
    output: imageUrl.pathname,
    card: {
      title: isHome ? site.name : pageTitle(meta("og:title") ?? ""),
      subtitle: isHome ? site.tagline : undefined,
      path: pagePath,
      locale: lang.toUpperCase(),
    },
  };
}

export default function ogImages(): AstroIntegration {
  return {
    name: "og-images",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const started = performance.now();
        const outDir = fileURLToPath(dir);
        const pages = await readBuiltPages(outDir);
        const jobs = pages.flatMap((page) => ogJobsFromHtml(page) ?? []);
        const palette = await readPaperPalette();
        for (const { output, card } of jobs) {
          const file = join(outDir, output);
          await mkdir(dirname(file), { recursive: true });
          await writeFile(file, await renderOgImage(card, palette));
        }
        const ms = Math.round(performance.now() - started);
        logger.info(`Rendered ${jobs.length} Open Graph images in ${ms}ms.`);
      },
    },
  };
}
