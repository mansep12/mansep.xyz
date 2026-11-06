import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: "https://mansep.xyz",
  // Every page is prerendered by default; the adapter only matters for
  // future on-demand routes (e.g. src/pages/api/ from cycle 2).
  adapter: cloudflare({
    // Optimize images at build time; avoids provisioning a Cloudflare Images binding.
    imageService: "compile",
  }),
  // No sessions needed: keeps the adapter from auto-provisioning a KV namespace.
  session: false,
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
