import { defineConfig } from "vitest/config";

// Two projects:
// - unit: pure modules (i18n, schemas, helpers, CV generator logic) in plain
//   Node; nothing there needs the Workers runtime or Astro's virtual modules.
// - astro: tests named *.astro.test.ts that render .astro components with the
//   Container API, through Astro's Vite config (vitest.astro.config.ts).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/**/*.astro.test.ts"],
        },
      },
      "./vitest.astro.config.ts",
    ],
  },
});
