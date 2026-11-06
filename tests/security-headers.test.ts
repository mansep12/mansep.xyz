import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cspHash, scanPage } from "../src/integrations/security-headers";
import {
  cspDirectives,
  HEADERS_LINE_LIMIT,
  headersRule,
  securityHeaders,
  serializeCsp,
} from "../src/lib/security-headers";
import { themeInitScript } from "../src/lib/theme-init";

const html = (head: string, body = "") =>
  `<!doctype html><html lang="es"><head>${head}</head><body>${body}</body></html>`;

describe("cspHash", () => {
  it("is the base64 SHA-256 of the exact UTF-8 text", () => {
    const expected = createHash("sha256").update("alert('á')", "utf8").digest("base64");
    expect(cspHash("alert('á')")).toBe(`'sha256-${expected}'`);
  });
});

describe("scanPage", () => {
  it("hashes the theme script, inline styles and styles inside <noscript>", () => {
    const scan = scanPage(
      html(
        `<style>\n  @layer a, b;\n</style><script>${themeInitScript}</script>` +
          "<noscript><style>[data-x]{display:none}</style></noscript>",
      ),
    );
    expect(scan.scripts).toEqual([cspHash(themeInitScript)]);
    expect(scan.styles).toEqual([cspHash("\n  @layer a, b;\n"), cspHash("[data-x]{display:none}")]);
    expect(scan.problems).toEqual([]);
  });

  it("skips external scripts and data blocks such as JSON-LD", () => {
    const scan = scanPage(
      html(
        '<script type="module" src="/_astro/a.js"></script>' +
          '<script type="application/ld+json">{"@type":"Person"}</script>',
      ),
    );
    expect(scan.scripts).toEqual([]);
  });

  it("reports what the policy would block", () => {
    const scan = scanPage(
      html(
        '<script src="https://cdn.example.com/x.js"></script>',
        '<button onclick="go()">Go</button><svg style="color:red"></svg>' +
          '<a href="javascript:void(0)">x</a><iframe src="https://www.youtube.com/embed/x"></iframe>',
      ),
    );
    expect(scan.problems).toEqual([
      "inline event handler onclick on <button>",
      "style attribute on <svg> (use a class)",
      "javascript: URL in href on <a>",
      "script-src does not allow https://cdn.example.com/x.js",
      "frame-src does not allow https://www.youtube.com/embed/x",
    ]);
  });

  it("accepts same-origin resources and the allowed third parties", () => {
    const scan = scanPage(
      html(
        '<link rel="stylesheet" href="/_astro/a.css">' +
          '<script defer src="https://static.cloudflareinsights.com/beacon.min.js"></script>' +
          '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>',
        '<img src="/og/index.png" alt=""><img src="data:image/png;base64,AA==" alt="">' +
          '<iframe src="https://www.youtube-nocookie.com/embed/x"></iframe>',
      ),
    );
    expect(scan.problems).toEqual([]);
  });
});

describe("securityHeaders", () => {
  const hashes = { scripts: [cspHash(themeInitScript)], styles: [cspHash("a{}")] };
  const headers = Object.fromEntries(securityHeaders(hashes));

  it("builds a strict policy with the inline hashes", () => {
    const csp = headers["Content-Security-Policy"];
    expect(csp).toContain(`script-src 'self' ${cspHash(themeInitScript)} `);
    expect(csp).toContain(`style-src 'self' ${cspHash("a{}")};`);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp.endsWith("upgrade-insecure-requests")).toBe(true);
  });

  it("sets HSTS without preload and the other headers", () => {
    expect(headers["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });

  it("serializes directives without sources as bare names", () => {
    expect(serializeCsp({ "default-src": ["'self'"], "upgrade-insecure-requests": [] })).toBe(
      "default-src 'self'; upgrade-insecure-requests",
    );
    expect(Object.keys(cspDirectives({ scripts: [], styles: [] }))).toContain("base-uri");
  });
});

describe("headersRule", () => {
  it("writes a _headers block", () => {
    expect(headersRule("/*", [["X-A", "1"]])).toBe("/*\n  X-A: 1\n");
  });

  it("refuses a line Cloudflare would reject", () => {
    expect(() => headersRule("/*", [["X-A", "a".repeat(HEADERS_LINE_LIMIT)]])).toThrow(/2000/);
  });
});
