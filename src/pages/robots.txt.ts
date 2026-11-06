/**
 * robots.txt: allow everything and point to the sitemap. Built from the site
 * URL so the domain lives in one place. Cloudflare may prepend its own
 * managed rules (content signals, AI crawler preferences) when serving it.
 */
import type { APIRoute } from "astro";
import { site } from "../data/site";

export const GET: APIRoute = () =>
  new Response(
    ["User-agent: *", "Allow: /", "", `Sitemap: ${site.url}/sitemap-index.xml`, ""].join("\n"),
    {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
