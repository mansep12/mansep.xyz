/**
 * Locally stored video posters, one per project: `src/assets/projects/<slug>-pitch.jpg`
 * (or .png, .webp). Stored in the repo so the page makes no request to
 * YouTube before the reader presses play.
 */

import type { ImageMetadata } from "astro";

const posters = import.meta.glob<ImageMetadata>("../../assets/projects/*-pitch.{jpg,png,webp}", {
  eager: true,
  import: "default",
});

export function posterFor(slug: string): ImageMetadata | undefined {
  const name = `${slug}-pitch`;
  for (const [path, image] of Object.entries(posters)) {
    const file = path.slice(path.lastIndexOf("/") + 1);
    if (file.slice(0, file.lastIndexOf(".")) === name) return image;
  }
  return undefined;
}
