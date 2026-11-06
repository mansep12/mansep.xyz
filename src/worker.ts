/**
 * Worker entrypoint. Requests go to the Astro Cloudflare adapter's handler,
 * as with the default entrypoint; this file exists to also export the
 * Durable Object class the CV generator uses for its daily budget.
 * Static pages are served from assets without running this code.
 */

import { handle } from "@astrojs/cloudflare/handler";

export { CvBudget } from "./durable-objects/cv-budget";

export default {
  fetch(request, env, ctx) {
    return handle(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
