---
status: accepted
date: 2026-11-06
decision-makers: Manuel Sepúlveda
---

# Host on Cloudflare Workers with static assets

## Context and Problem Statement

The site is static today (every page is prerendered), but later stages add a
Worker endpoint for the CV generator, a bot check on its form, an AI gateway,
a private app behind an access gate and an inbound email address. Where should
the site and those pieces run?

## Decision Drivers

- No monthly cost for a personal site with modest traffic.
- One account and one bill for hosting, DNS, bot protection, AI calls,
  access control and email.
- A platform already used in real work, so time goes to the site, not to
  learning a host.
- Static files served from a CDN, with a path to server code when needed.

## Considered Options

- Cloudflare Workers with static assets
- Cloudflare Pages
- Vercel
- Netlify or GitHub Pages

## Decision Outcome

Chosen option: "Cloudflare Workers with static assets", because the free plan
covers the site (requests for static assets are free, and the future endpoint
starts within the free Worker limits), it is what Pulso Urbano already runs
on, and the same account provides AI Gateway, Turnstile, Access, Email
Routing and Web Analytics.

The choice is not based on how a host looks on a CV. There is no evidence that
hosting on Vercel reads as "made with AI"; what readers notice is template
design, which is a separate concern (ADR 0005).

### Consequences

- Good, because the site costs nothing to host and the domain, DNS and
  certificates live in the same account.
- Good, because static pages and the future `/api/*` Worker deploy together
  from one `wrangler.jsonc`, built by Workers Builds on every push to `main`.
- Good, because static responses get headers from a `_headers` file
  (ADR 0007) without running Worker code.
- Bad, because Workers-specific details (the workerd prerender runtime,
  `_headers` not applying to Worker responses) need care and are less
  documented than the big static hosts.
- Bad, because generating PDFs or heavy work inside a free Worker is limited
  by CPU time; that is measured before the CV generator ships.

### Confirmation

`wrangler.jsonc` declares the assets directory and the custom domain;
production responses carry `server: cloudflare` and the headers from
`dist/client/_headers`.

## Pros and Cons of the Options

### Cloudflare Workers with static assets

- Good, because it is Cloudflare's current recommended target (Pages is in
  maintenance) and the Astro adapter builds for it.
- Good, because the free plan and the rest of the account cover every later
  stage.
- Bad, because some platform behavior is only learnable by reading Workers
  docs closely.

### Cloudflare Pages

- Good, because it is simple for static sites.
- Bad, because new features land in Workers first and the Astro adapter no
  longer targets Pages.

### Vercel

- Good, because the developer experience is excellent.
- Bad, because AI calls, bot checks, access control and email would need
  other providers and accounts.

### Netlify or GitHub Pages

- Good, because they are mature for static sites.
- Bad, because the CV endpoint and the rest of the stack would live
  elsewhere, splitting accounts and configuration.
