---
status: accepted
date: 2026-11-06
decision-makers: Manuel Sepúlveda
---

# Security headers and a hash-based Content-Security-Policy generated at build

## Context and Problem Statement

The site belongs to someone who presents himself as a security engineer, so
its own headers will be inspected. Pages are static files served by Workers
static assets (ADR 0002), with a few inline blocks Astro emits (the theme
script, the cascade layer order, font faces) and planned third parties:
Cloudflare Web Analytics, a click-to-load YouTube player and Cloudflare
Turnstile on the CV generator form. How are security headers set, and how
does the Content-Security-Policy allow the inline blocks without
`'unsafe-inline'`?

## Decision Drivers

- No `'unsafe-inline'` or `'unsafe-eval'` for scripts or styles.
- The policy must never drift from the pages: a changed inline script must
  not ship with a stale hash.
- Static responses only: no Worker code in the request path for pages.
- Third-party origins listed explicitly, each with a reason.

## Considered Options

- `_headers` generated after the build, with SHA-256 hashes read from the built HTML
- A hand-written `public/_headers` with hashes pasted in
- Astro's built-in CSP (`security.csp`), which emits a `<meta>` tag
- Nonces set by a Worker on every request
- `'unsafe-inline'` for styles

## Decision Outcome

Chosen option: "`_headers` generated after the build". The integration
`src/integrations/security-headers.ts` runs on `astro:build:done`, reads every
HTML file in `dist/client`, hashes each inline `<script>` (data blocks such as
JSON-LD excluded) and `<style>` (including the one inside `<noscript>`), and
appends one `/*` rule to `dist/client/_headers`, after the adapter's
immutable `Cache-Control` rule for `/_astro/*`. The policy itself is in
`src/lib/security-headers.ts`:

- `default-src 'self'`; `script-src 'self'` plus the script hashes,
  `https://static.cloudflareinsights.com` and `https://challenges.cloudflare.com`;
  `style-src 'self'` plus the style hashes; `img-src 'self' data:`;
  `font-src 'self'`; `connect-src 'self' https://cloudflareinsights.com`;
  `frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com`;
  `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`;
  `object-src 'none'`; `upgrade-insecure-requests`.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`, without
  `preload`: the preload list is slow to leave and subdomains are still being
  planned.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`
  and `Permissions-Policy: camera=(), microphone=(), geolocation=(),
  browsing-topics=()` (`browsing-topics` replaces the retired
  `interest-cohort`).

To keep the hash list short and stable, component CSS and scripts ship as
files (`build.inlineStylesheets: "never"`, `vite.build.assetsInlineLimit: 0`).
What remains inline is fixed per build: the theme script, the email
placeholder script, the layer order, two `@font-face` blocks from the Fonts
API and the no-JavaScript style.

The build fails if a page contains something the policy would block: an
inline event handler, a `style` attribute, a `javascript:` URL, or a script,
stylesheet, frame or image from an origin the policy does not allow. It also
fails if a header line exceeds Cloudflare's 2,000-character limit, or if
`public/_headers` tries to set its own CSP.

### Consequences

- Good, because hashes cannot go stale: they are computed from the exact
  bytes that ship, every build.
- Good, because the policy is strict without nonces, so pages stay static
  and cacheable.
- Good, because mistakes that a CSP would silently block in production
  (a `style="..."` in a diagram, an `onclick`) fail the build with the file
  name instead.
- Bad, because `_headers` applies only to static asset responses. A route
  rendered on demand by the Worker (such as `/api/*`) gets none of these
  headers and must set its own; pages should stay prerendered.
- Bad, because a new third party (a font CDN, an embed) needs a code change
  in `src/lib/security-headers.ts`, by design.
- Neutral, because Cloudflare features that inject inline scripts into HTML
  (Rocket Loader, Bot Fight Mode JavaScript detections) are off; turning one
  on requires revisiting the policy. Web Analytics automatic injection adds
  an external script from `static.cloudflareinsights.com` that reports to
  the same origin, which the policy already allows.

### Confirmation

Unit tests cover hashing, the policy text and the build-time checks
(`tests/security-headers.test.ts`). The deployed headers are checked with
`curl -sI https://mansep.xyz/`, and pages were loaded with the browser
console open to confirm no violations.

## Pros and Cons of the Options

### A hand-written `public/_headers`

- Good, because it is simple to read.
- Bad, because any change to an inline block (the theme script, a font
  setting) silently breaks the page until someone updates the hash.

### Astro's built-in CSP

- Good, because Astro computes the hashes itself.
- Bad, because it emits a `<meta http-equiv>` policy, which cannot carry
  `frame-ancestors` and would combine with a header policy as two
  separate policies; the other headers still need `_headers`.

### Nonces from a Worker

- Good, because it allows dynamic inline code.
- Bad, because every page request would run Worker code to rewrite HTML,
  for a site with no dynamic inline code.

### `'unsafe-inline'` for styles

- Good, because it removes the style hashes.
- Bad, because it allows injected styles, which can still exfiltrate data
  through selectors and is a visible weakness in a security engineer's site;
  hashes proved feasible.
