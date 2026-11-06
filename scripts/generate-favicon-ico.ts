/**
 * Writes public/favicon.ico (16, 32 and 48 px, PNG entries) from
 * public/favicon.svg in its light scheme, for clients that request
 * /favicon.ico instead of reading the SVG link. Run it again after changing
 * the SVG:
 *
 *   bun scripts/generate-favicon-ico.ts
 */

import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const SIZES = [16, 32, 48] as const;
const root = new URL("../", import.meta.url);

// resvg ignores the SVG's dark-scheme media query, so this is the light icon.
const svg = await readFile(new URL("public/favicon.svg", root), "utf8");
const images = SIZES.map((size) =>
  new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng(),
);

// ICONDIR (6 bytes), one ICONDIRENTRY (16 bytes) per image, then the PNGs.
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((png, index) => {
  const entry = 6 + 16 * index;
  header.writeUInt8(SIZES[index], entry);
  header.writeUInt8(SIZES[index], entry + 1);
  header.writeUInt8(0, entry + 2);
  header.writeUInt8(0, entry + 3);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});

const ico = Buffer.concat([header, ...images]);
await writeFile(new URL("public/favicon.ico", root), ico);
console.log(`public/favicon.ico: ${SIZES.join(", ")} px, ${ico.length} bytes`);
