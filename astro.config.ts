import { execFileSync } from "node:child_process";
import cloudflare from "@astrojs/cloudflare";
import { defineConfig, fontProviders } from "astro/config";
import { site } from "./src/data/site";
import { defaultLang, locales } from "./src/i18n/locales";
import { resolveBuildCommit } from "./src/lib/build-info";

// Resolved here, in Node: pages are prerendered in workerd, which has no git.
const buildCommit = resolveBuildCommit({
  env: process.env,
  gitHead: () =>
    execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
});

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: site.url,
  // Every page is prerendered by default; the adapter only matters for
  // future on-demand routes (e.g. src/pages/api/ from cycle 2).
  adapter: cloudflare({
    // Optimize images at build time; avoids provisioning a Cloudflare Images binding.
    imageService: "compile",
  }),
  // No sessions needed: keeps the adapter from auto-provisioning a KV namespace.
  session: false,
  // Emit `about.html` for `about.astro`: Cloudflare static assets serve it at
  // `/about` with no redirect, matching the paths in src/i18n/routes.ts.
  build: {
    format: "preserve",
  },
  // Self-hosted IBM Plex: downloaded from Fontsource at build time and served
  // from /_astro/fonts/. Only latin and latin-ext (Spanish diacritics).
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "IBM Plex Sans",
      cssVariable: "--font-plex-sans",
      weights: ["100 700"],
      styles: ["normal", "italic"],
      subsets: ["latin", "latin-ext"],
      fallbacks: ["sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "IBM Plex Mono",
      cssVariable: "--font-plex-mono",
      weights: [400, 500],
      styles: ["normal"],
      subsets: ["latin", "latin-ext"],
      fallbacks: ["monospace"],
    },
  ],
  vite: {
    define: {
      __BUILD_COMMIT__: JSON.stringify(buildCommit),
    },
  },
  i18n: {
    defaultLocale: defaultLang,
    locales: [...locales],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
