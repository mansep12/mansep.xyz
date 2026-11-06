---
status: accepted
date: 2026-11-06
decision-makers: Manuel Sepúlveda
---

# Use Astro as the site framework

## Context and Problem Statement

The site is mostly reading material in two languages: a home page, project
case studies, research, about, CV, privacy and colophon. Later it needs one
server endpoint. Which framework fits a content site that a tech lead may open
on GitHub to judge how it is built?

## Decision Drivers

- Typed content: a project without evidence (repo or demo, role, outcome)
  should fail the build.
- Internationalized routing and hreflang in the framework, not bolted on.
- No client JavaScript unless a feature needs it.
- An official, maintained adapter for Cloudflare Workers (ADR 0002).
- A codebase whose structure is readable in a few minutes.

## Considered Options

- Astro with `@astrojs/cloudflare`
- TanStack Start
- Next.js through OpenNext
- SvelteKit

## Decision Outcome

Chosen option: "Astro", because it ships content collections with schemas,
i18n routing, a sitemap integration, self-hosted fonts and zero JavaScript by
default in one framework, and its Cloudflare adapter runs workerd in
development, prerender and production.

### Consequences

- Good, because content rules live in schemas (`src/lib/content/schemas.ts`,
  `src/data/resume.schema.ts`) and break the build when violated.
- Good, because pages ship HTML and CSS plus a few small scripts (theme,
  email, print button, video facade).
- Good, because the future CV endpoint is an on-demand route in the same
  project.
- Bad, because pages are prerendered in workerd, so build-time values
  (commit, analytics token) must be resolved in `astro.config.ts` and
  injected.
- Bad, because Astro's own i18n helpers assume the same path in every
  locale; translated slugs (`/sobre-mi`, `/en/about`) need the small route
  map in `src/i18n/routes.ts`.

### Confirmation

`astro.config.ts`, `src/content.config.ts` and the route map are the files a
reviewer should read first; `bun run build` type-checks and validates all
content.

## Pros and Cons of the Options

### Astro

- Good, because content, i18n and static output are core features.
- Neutral, because interactive islands are possible but not needed here.

### TanStack Start

- Good, because it is stable since 1.0 and already used in Pulso Urbano.
- Bad, because it is an application framework that hydrates React on every
  page and has no content layer or i18n; it fits the demos on subdomains, not
  this site.

### Next.js through OpenNext

- Good, because it is widely known.
- Bad, because it runs on Workers through a translation layer with frequent
  patches and no bindings in `next dev`, and its main features (server
  components, app router) do not help a content site.

### SvelteKit

- Good, because its Cloudflare adapter is official and complete.
- Bad, because typed Markdown content and i18n need community packages, and
  the author does not use Svelte day to day.
