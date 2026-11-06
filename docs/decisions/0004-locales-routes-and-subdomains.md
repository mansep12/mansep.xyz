---
status: accepted
date: 2026-11-06
decision-makers: Manuel Sepúlveda
---

# Spanish at the root, English under /en/, paths for content, subdomains for apps

## Context and Problem Statement

The site serves teams in Chile and teams that work in English. Later it will
also host running applications (a Nodus demo, a private app). How are
languages and applications laid out in URLs?

## Decision Drivers

- The first audience reads Spanish; English must be complete from day one.
- Search engines must see each language as its own indexable URL.
- Visitors choose the language; shared links must open what was shared.
- Applications have their own cookies, security policy and deploy cycle.

## Considered Options

- Spanish at `/`, English at `/en/`, no automatic redirect
- `/es/` and `/en/` with a redirect at the root
- Redirect by browser language (`Accept-Language`) or IP
- Applications under paths of the main site instead of subdomains

## Decision Outcome

Chosen option: "Spanish at `/`, English at `/en/`, no automatic redirect",
with translated slugs (`/sobre-mi` and `/en/about`), a language switch on every
page that links to the same page in the other language, and `hreflang`
alternates plus `x-default` (Spanish) in the HTML and the sitemap.

Content that people read lives under paths of `mansep.xyz`. Applications that
run live on first-level subdomains (`nodus.mansep.xyz`), each deployed on its
own; a private one sits behind Cloudflare Access. One level only, because
the universal certificate covers `*.mansep.xyz` and not deeper names.

### Consequences

- Good, because the root is a real, indexable page in the main audience's
  language, with no redirect hop.
- Good, because a shared link always opens the language it was shared in.
- Good, because an application's cookies, CSP and outages stay away from the
  main site (the site sends `frame-ancestors 'none'` and its own CSP; an app
  can relax its own without touching the site).
- Bad, because translated slugs need a route map and a check that both
  locales exist (`src/i18n/routes.ts`, sitemap alternates from that map).
- Bad, because HSTS with `includeSubDomains` (ADR 0007) requires every
  subdomain to serve HTTPS.

### Confirmation

Every page emits a self-referencing canonical and reciprocal `hreflang` links;
`bun run check:links` fails if an alternate does not link back.

## Pros and Cons of the Options

### `/es/` and `/en/` with a root redirect

- Good, because it is symmetric.
- Bad, because the root becomes a redirect instead of a page, costing a hop
  for the main audience.

### Redirect by browser language or IP

- Bad, because Google advises against it, it traps visitors and crawlers in
  one language and it breaks shared links.

### Applications under paths

- Good, because one deploy.
- Bad, because cookies and security policy would be shared with the site,
  and a failing app could take the site down.
