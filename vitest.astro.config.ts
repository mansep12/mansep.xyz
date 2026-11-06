import { getViteConfig } from "astro/config";

// Tests that render .astro components (Container API) need Astro's Vite
// plugins, so they load the project's astro.config.ts. See vitest.config.ts.
export default getViteConfig({
  test: {
    name: "astro",
    environment: "node",
    include: ["tests/**/*.astro.test.ts"],
  },
});
