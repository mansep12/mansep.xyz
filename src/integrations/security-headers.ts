/**
 * Writes the security headers (src/lib/security-headers.ts) to
 * dist/client/_headers after the build, with a Content-Security-Policy whose
 * script and style hashes come from the built HTML itself, so the policy
 * cannot drift from the pages.
 *
 * The build fails when a page has something the policy would block: an
 * inline event handler, a `style` attribute, a `javascript:` URL, or a
 * script, stylesheet, frame or image from an origin the policy does not list.
 */

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { parse } from "node-html-parser";
import { site } from "../data/site";
import { cspDirectives, headersRule, securityHeaders } from "../lib/security-headers";
import { readBuiltPages } from "./built-pages";

/** `type` values of scripts the browser executes (others, like JSON-LD, are data). */
const EXECUTABLE_SCRIPT_TYPES = new Set([
  "",
  "text/javascript",
  "application/javascript",
  "module",
]);

/** Elements whose URL attribute loads a resource, and the directive that governs it. */
const RESOURCE_ATTRIBUTES = [
  { selector: "script[src]", attribute: "src", directive: "script-src" },
  { selector: 'link[rel~="stylesheet"][href]', attribute: "href", directive: "style-src" },
  { selector: "iframe[src]", attribute: "src", directive: "frame-src" },
  { selector: "img[src]", attribute: "src", directive: "img-src" },
] as const;

/** A CSP hash source for an inline block, e.g. `'sha256-AbC...='`. */
export function cspHash(content: string): string {
  return `'sha256-${createHash("sha256").update(content, "utf8").digest("base64")}'`;
}

export interface PageScan {
  readonly scripts: string[];
  readonly styles: string[];
  /** Things the policy would block, one message each. */
  readonly problems: string[];
}

/** Inline hashes and policy problems of one HTML page. */
export function scanPage(html: string): PageScan {
  // Parse <noscript> as markup so a <style> inside it is found and hashed.
  const root = parse(html, { blockTextElements: { script: true, style: true } });
  const scripts: string[] = [];
  const styles: string[] = [];
  const problems: string[] = [];
  const allowed = cspDirectives({ scripts: [], styles: [] });

  for (const script of root.querySelectorAll("script")) {
    if (script.hasAttribute("src")) continue;
    const type = (script.getAttribute("type") ?? "").trim().toLowerCase();
    if (EXECUTABLE_SCRIPT_TYPES.has(type)) scripts.push(cspHash(script.rawText));
  }
  for (const style of root.querySelectorAll("style")) {
    styles.push(cspHash(style.rawText));
  }

  for (const element of root.querySelectorAll("*")) {
    for (const [name, value] of Object.entries(element.attributes)) {
      const attribute = name.toLowerCase();
      if (attribute.startsWith("on")) {
        problems.push(`inline event handler ${attribute} on <${element.rawTagName}>`);
      } else if (attribute === "style") {
        problems.push(`style attribute on <${element.rawTagName}> (use a class)`);
      } else if (/^\s*javascript:/i.test(value)) {
        problems.push(`javascript: URL in ${attribute} on <${element.rawTagName}>`);
      }
    }
  }

  for (const { selector, attribute, directive } of RESOURCE_ATTRIBUTES) {
    for (const element of root.querySelectorAll(selector)) {
      const url = new URL(element.getAttribute(attribute) ?? "", site.url);
      const sources = allowed[directive] ?? [];
      const permitted =
        url.origin === site.url
          ? sources.includes("'self'")
          : sources.includes(url.origin) || (url.protocol === "data:" && sources.includes("data:"));
      if (!permitted) {
        problems.push(`${directive} does not allow ${url.href}`);
      }
    }
  }

  return { scripts, styles, problems };
}

const GENERATED_COMMENT =
  "# Security headers, generated from the built pages (src/integrations/security-headers.ts).";

export default function securityHeadersIntegration(): AstroIntegration {
  return {
    name: "security-headers",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const pages = await readBuiltPages(outDir);
        const scripts = new Set<string>();
        const styles = new Set<string>();
        const problems: string[] = [];
        for (const page of pages) {
          const scan = scanPage(page.html);
          for (const hash of scan.scripts) scripts.add(hash);
          for (const hash of scan.styles) styles.add(hash);
          problems.push(...scan.problems.map((problem) => `${page.file}: ${problem}`));
        }
        if (problems.length > 0) {
          throw new Error(
            `The Content-Security-Policy would block parts of these pages:\n${problems.join("\n")}`,
          );
        }

        const headersFile = join(outDir, "_headers");
        const existing = await readFile(headersFile, "utf8").catch(() => "");
        if (/^\s*Content-Security-Policy\s*:/im.test(existing)) {
          throw new Error(
            "_headers already sets a Content-Security-Policy; it is generated at build time. Remove it from public/_headers.",
          );
        }
        const rule = headersRule(
          "/*",
          securityHeaders({ scripts: [...scripts].sort(), styles: [...styles].sort() }),
        );
        const prefix = existing.trim() ? `${existing.trimEnd()}\n\n` : "";
        await writeFile(headersFile, `${prefix}${GENERATED_COMMENT}\n${rule}`);
        logger.info(
          `_headers: CSP with ${scripts.size} script and ${styles.size} style hashes from ${pages.length} pages.`,
        );
      },
    },
  };
}
