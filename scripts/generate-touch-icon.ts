/**
 * Writes public/apple-touch-icon.png (180x180) from the favicon's mark and
 * the light color tokens. Run it again after changing either:
 *
 *   bun scripts/generate-touch-icon.ts
 *
 * iOS rounds the corners itself and shows transparency as black, so the
 * background is a full square.
 */

import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import { colorToken, parseColorTokens } from "../src/lib/color-tokens";

const SIZE = 180;
const root = new URL("../", import.meta.url);

const tokens = parseColorTokens(await readFile(new URL("src/styles/tokens.css", root), "utf8"));
const ink = colorToken(tokens, "text").light;
const paper = colorToken(tokens, "bg").light;

// Same "M" as public/favicon.svg, a little smaller inside the full square.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${ink}" />
  <path transform="translate(16 16) scale(0.8) translate(-16 -16)" d="M8.5 23.5V9l7.5 9 7.5-9v14.5"
    fill="none" stroke="${paper}" stroke-width="3.2" stroke-linejoin="miter" />
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: "width", value: SIZE } }).render().asPng();
await writeFile(new URL("public/apple-touch-icon.png", root), png);
console.log(`public/apple-touch-icon.png: ${SIZE}x${SIZE}, ${png.length} bytes`);
