# mansep.xyz

Personal site and portfolio of Manuel Sepúlveda, software engineer focused on
backend, applied cryptography and security.

The site is bilingual: Spanish at the root (`/`) and English under `/en/`.
It is a static Astro site served by Cloudflare Workers with static assets.

> Status: v0.1 in progress. Home, projects, research, about, CV, privacy,
> colophon and 404 pages exist; full project write-ups are on the way.

## Stack

- [Astro](https://astro.build) 7 with the official
  [`@astrojs/cloudflare`](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) adapter
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) with static assets, deployed with
  [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- Plain CSS (no CSS framework)
- [Biome](https://biomejs.dev) for linting and formatting
- [Vitest](https://vitest.dev) for tests
- [Bun](https://bun.sh) as package manager and script runner; Node.js 22 runs the Astro CLI

## Requirements

- Node.js 22 (see `.nvmrc`). With nvm: `nvm install && nvm use`.
- Bun 1.3 or newer.

Make sure `node` resolves to Node 22 before running scripts (`node -v`).
`bun run` executes package binaries with whatever `node` is first in `PATH`;
if a `node` shim pointing to Bun comes first, Astro runs under Bun instead of
Node. Running `nvm use` in the project directory puts Node 22 first.

## Getting started

```sh
nvm use
bun install
bun run dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Generates Worker types and starts the Astro dev server (workerd runtime). |
| `bun run build` | Generates Worker types, type-checks and builds the site into `dist/`. |
| `bun run preview` | Serves the last build locally with `wrangler dev` (run `build` first). |
| `bun run deploy` | Builds and deploys with `wrangler deploy`. |
| `bun run check` | Type-checks `.astro` and TypeScript files with `astro check`. |
| `bun run lint` | Runs Biome (lint, format check and import sorting) without writing. |
| `bun run format` | Runs Biome and applies safe fixes and formatting. |
| `bun run test` | Runs Vitest once. |
| `bun run cf-typegen` | Regenerates `worker-configuration.d.ts` from `wrangler.jsonc`. |

## Project structure

```
.
├── astro.config.ts           # Site URL, adapter, fonts, i18n, build commit
├── wrangler.jsonc            # Cloudflare Worker config
├── vitest.config.ts          # Unit tests (plain Node)
├── docs/decisions/           # Architecture Decision Records (MADR)
├── public/                   # Static files served as-is
├── tests/                    # Vitest unit tests
└── src/
    ├── content.config.ts     # Collections: projects, research, pages, resume
    ├── content/
    │   ├── projects/{es,en}/ # <slug>.md per locale
    │   ├── research/{es,en}/
    │   └── pages/{es,en}/    # about, privacy, colophon prose
    ├── data/
    │   ├── site.ts           # Name, tagline, email, links
    │   ├── resume.{es,en}.json
    │   └── resume.schema.ts  # CV schema and loader
    ├── i18n/
    │   ├── locales.ts        # Locales and their metadata
    │   ├── routes.ts         # es/en route map and URL helpers
    │   └── ui.ts             # UI strings and one-line page copy
    ├── components/           # Site chrome, plus one folder per page (home/, cv/, ...)
    ├── layouts/BaseLayout.astro
    ├── lib/                  # Content helpers, build info, theme, email
    ├── scripts/              # Client-side TypeScript
    ├── pages/                # Spanish routes
    │   └── en/               # English routes
    └── styles/               # tokens.css, base.css
```

## i18n

Spanish lives at the root and English under `/en/`; there is no automatic
redirect by browser language. Every page has a key in the route map
(`src/i18n/routes.ts`) with one path per locale:

```ts
localizedPath("project", "en", { slug: "nodus" }); // "/en/projects/nodus"
alternates("about"); // { es: "https://mansep.xyz/sobre-mi", en: "https://mansep.xyz/en/about" }
getLangFromUrl(Astro.url); // "es" | "en"
```

Pages pass their route to the layout, which emits the canonical URL, the
`hreflang` alternates (plus `x-default`, pointing to Spanish) and a language
switch that links to the same page in the other locale:

```astro
<BaseLayout lang="en" routeKey="project" params={{ slug }} title={title} description={summary}>
```

Pass `translated={false}` for a page that exists in one locale only.

Paths have no trailing slash (except the home pages). With
`build.format: "preserve"`, `src/pages/proyectos.astro` builds to
`proyectos.html`, which Cloudflare serves at `/proyectos` without a redirect.
Create `proyectos.astro`, not `proyectos/index.astro`.

UI strings and one-line page copy (headings, labels, the availability line)
live in `src/i18n/ui.ts`, where the types require every key in every locale.
Paragraphs live in content files.

A page outside the route map (only `src/pages/404.astro`) omits `routeKey`:
it gets no canonical URL, no `hreflang` and no language switch. Cloudflare
serves it for any unknown path (`not_found_handling: "404-page"`).

## Content model

- **Projects**: `src/content/projects/<lang>/<slug>.md`. The slug is the file
  name and is shared by both locales. The schema
  (`src/lib/content/schemas.ts`) requires a repo or demo link, a role and a
  one-line outcome, so an unverifiable project fails the build.
- **Research**: `src/content/research/<lang>/<slug>.md` (thesis, capsule or
  course). Bodies use `###` headings: each entry title is an `h2` on the page.
- **Pages**: `src/content/pages/<lang>/<slug>.md` for long prose (about,
  privacy, colophon), with a title and a description.
- **CV**: `src/data/resume.{es,en}.json`, in the
  [JSON Resume](https://jsonresume.org/schema) shape with an `{ id, text }`
  object per highlight. Highlight ids are stable and identical in both
  locales. The schema rejects a phone number and a street address.
  `src/components/cv/CvDocument.astro` renders any resume object, on screen
  and as A4 in print, so a tailored CV reuses it.

Read content through `src/lib/content`: `getProjects(lang)`,
`getResearch(lang)`, `getPage(lang, slug)`, `getResume(lang)`,
`findCounterpart(collection, entry)`.

Single-line frontmatter fields reject en and em dashes.

## Theme, fonts and build info

- Colors are semantic tokens in `src/styles/tokens.css`, resolved per color
  scheme with `light-dark()`. The toggle cycles system, light and dark; a
  short inline script applies the stored choice before first paint.
- IBM Plex Sans and Mono are self-hosted through the Astro Fonts API
  (Fontsource provider, latin and latin-ext only). The files are downloaded at
  build time, so builds need network access.
- The footer shows the commit the site was built from:
  `WORKERS_CI_COMMIT_SHA` on Workers Builds, else `git rev-parse HEAD`, else
  `dev` (`src/lib/build-info.ts`).

## Environment variables

Set in the Workers Builds settings (Settings, Build, Variables and secrets);
locally, export them before `bun run build`. They are read in Node when
`astro.config.ts` loads, because pages are prerendered in workerd.

| Variable | Effect |
| --- | --- |
| `PUBLIC_CF_WEB_ANALYTICS_TOKEN` | Site token from Cloudflare Web Analytics (32 hex characters). When set, every page loads the cookieless beacon from `static.cloudflareinsights.com`; when unset, no analytics script is added. A malformed value fails the build. Use the manual JS snippet setup in the dashboard, not automatic injection, or the beacon loads twice. |
| `WORKERS_CI_COMMIT_SHA` | Set by Workers Builds; the commit shown in the footer. |

## Licensing

- **Code** is licensed under the [MIT License](./LICENSE).
- **Content** (texts, CV files, images, and page prose in Spanish and English)
  is © Manuel Sepúlveda, all rights reserved. See
  [`LICENSE-CONTENT.md`](./LICENSE-CONTENT.md).

If you reuse the code, replace the content with your own.

## Decisions

Architecture decisions are recorded in [`docs/decisions/`](./docs/decisions/).
