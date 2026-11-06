import { defineConfig } from "vitest/config";

// Unit tests for pure modules (i18n, schemas, helpers). They run in plain
// Node; nothing here needs the Workers runtime or Astro's virtual modules.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
