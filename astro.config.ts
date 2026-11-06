import { execFileSync } from "node:child_process";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import { site } from "./src/data/site";
import { defaultLang, locales } from "./src/i18n/locales";
import ogImages from "./src/integrations/og-images";
import securityHeaders from "./src/integrations/security-headers";
import { resolveAnalyticsToken } from "./src/lib/analytics";
import { resolveBuildCommit } from "./src/lib/build-info";
import { resolveGeneratorBuildConfig } from "./src/lib/cv-generator/build-config";
import { canonicalPageUrl, sitemapLinks } from "./src/lib/sitemap";

// Resolved here, in Node: pages are prerendered in workerd, which has no git.
const buildCommit = resolveBuildCommit({
  env: process.env,
  gitHead: () =>
    execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
});

// Cloudflare Web Analytics site token from the build environment, or null.
const analyticsToken = resolveAnalyticsToken(process.env);

// CV generator form on /cv: shipped only with CV_GENERATOR_ENABLED=true and a
// Turnstile site key in the build environment.
const cvGenerator = resolveGeneratorBuildConfig(process.env);

// Canonical URL of every page in the sitemap, collected by `filter`, which
// sees every page before `serialize` runs.
const sitemapUrls = new Set<string>();

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: site.url,
  // Every page is prerendered by default; the adapter only matters for
  // future on-demand routes (e.g. src/pages/api/ from cycle 2).
  adapter: cloudflare({
    // Optimize images at build time; avoids provisioning a Cloudflare Images binding.
    imageService: "compile",
  }),
  integrations: [
    // sitemap-index.xml with hreflang alternates from the route map (see
    // src/lib/sitemap.ts for why not the integration's own i18n option).
    // Only pages in the route map are listed: no 404, no robots.txt.
    sitemap({
      namespaces: { news: false, image: false, video: false },
      filter: (url) => {
        const canonical = canonicalPageUrl(url);
        if (canonical) sitemapUrls.add(canonical);
        return canonical !== undefined;
      },
      serialize: (item) => {
        const url = canonicalPageUrl(item.url) ?? item.url;
        return { ...item, url, links: sitemapLinks(url, sitemapUrls) };
      },
    }),
    // dist/client/og/<path>.png for every page, rendered in Node after the build.
    ogImages(),
    // dist/client/_headers: CSP hashed from the built HTML, HSTS and friends.
    securityHeaders(),
  ],
  // No sessions needed: keeps the adapter from auto-provisioning a KV namespace.
  session: false,
  // Emit `about.html` for `about.astro`: Cloudflare static assets serve it at
  // `/about` with no redirect, matching the paths in src/i18n/routes.ts.
  build: {
    format: "preserve",
    // Component CSS ships as files, not <style> blocks: each inline block
    // would need its own hash in the Content-Security-Policy.
    inlineStylesheets: "never",
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
      __CF_WEB_ANALYTICS_TOKEN__: JSON.stringify(analyticsToken),
      __CV_GENERATOR__: JSON.stringify(cvGenerator),
    },
    build: {
      // Same reason for scripts (Astro inlines those under this limit) and
      // no data: URIs for small assets.
      assetsInlineLimit: 0,
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
