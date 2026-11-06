# mansep.xyz

Personal site and portfolio of Manuel Sepúlveda, software engineer focused on
backend, applied cryptography and security.

The site is bilingual: Spanish at the root (`/`) and English under `/en/`.
It is a static Astro site served by Cloudflare Workers with static assets.

> Status: v0.1 in progress. Home, projects with case studies, research,
> about, CV, privacy, colophon and 404 pages exist.

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
| `bun run check:links` | Checks the last build for broken internal links, fragments, canonical, hreflang, sitemap and image targets (run `build` first). |
| `bun run cf-typegen` | Regenerates `worker-configuration.d.ts` from `wrangler.jsonc`. |

## Project structure

```
.
├── astro.config.ts           # Site URL, adapter, integrations, fonts, i18n, build values
├── wrangler.jsonc            # Cloudflare Worker config
├── vitest.config.ts          # Unit tests (plain Node)
├── lighthouserc.json         # Lighthouse CI URLs and score budgets
├── .github/                  # CI workflow and Dependabot
├── docs/decisions/           # Architecture Decision Records (MADR)
├── public/                   # Static files served as-is (favicon, touch icon)
├── scripts/                  # Link checker, touch icon generator
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
    ├── integrations/         # Build steps in Node: Open Graph images, security headers
    ├── layouts/BaseLayout.astro
    ├── lib/                  # Content, SEO, structured data, headers, theme, email, analytics
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

## SEO and social previews

- **Head tags**: `BaseLayout` writes the title, description, a
  self-referencing canonical, `hreflang` alternates with `x-default`, Open
  Graph and Twitter tags (`summary_large_image`).
- **Structured data**: home and about pages pass `profile={resume}` to the
  layout, which emits a schema.org `ProfilePage` whose main entity is the
  `Person`, built from `site.ts` and the CV data
  (`src/lib/structured-data.ts`). Skills listed in `knowsAbout` are
  `site.featuredSkills`, which a test requires to exist in the CV.
- **Sitemap**: `@astrojs/sitemap` writes `sitemap-index.xml` with alternates
  taken from the route map (`src/lib/sitemap.ts`); `robots.txt` comes from
  `src/pages/robots.txt.ts`. Cloudflare may prepend its managed rules to it.
- **Open Graph images**: `src/integrations/og-images.ts` renders a
  1200x630 PNG per page and locale after the build, in Node (Satori and
  resvg, Plex `.woff` files from Fontsource, light palette read from
  `tokens.css`), to `dist/client/og/<path>.png`. The layout points `og:image`
  there unless a page passes `ogImage`.
- **Icons**: `public/favicon.svg` follows the color scheme;
  `public/apple-touch-icon.png` is generated with
  `bun scripts/generate-touch-icon.ts` and committed. The `theme-color` meta
  follows a forced theme too.

## Security headers

`src/integrations/security-headers.ts` appends the headers to
`dist/client/_headers` after every build (see
[ADR 0007](./docs/decisions/0007-security-headers-and-csp.md)): a
Content-Security-Policy with the SHA-256 hash of each inline script and style
found in the built HTML, HSTS (no preload), `nosniff`, a strict referrer
policy, a Permissions-Policy and `Cross-Origin-Opener-Policy: same-origin`.
The allowed third parties (Web Analytics, Turnstile, the YouTube player) are
listed in `src/lib/security-headers.ts`.

The build fails when a page would break the policy, so:

- no `style="..."` attributes, `on*` handlers or `javascript:` URLs (use
  classes and `<script>` modules);
- a new external origin needs an entry in `src/lib/security-headers.ts`;
- do not set a CSP in `public/_headers`; other rules there are kept.

`_headers` only applies to static files. Routes rendered on demand by the
Worker (for example `/api/*`) must set their own headers.

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests:

1. `bun install --frozen-lockfile`, lint, tests, build and `check:links`
   (Node 22 and Bun 1.3).
2. Lighthouse CI on the built `dist/client` (mobile): `/`, `/en/`,
   `/proyectos`, a project page, `/cv` and `/sobre-mi`, three runs each. The
   job fails below 0.9 performance or 0.95 accessibility, best practices or
   SEO. Reports go to temporary public storage; the links are in the job log.

Dependabot (`.github/dependabot.yml`) opens monthly grouped minor and patch
updates for Bun packages and GitHub Actions. Deploys are done by Workers
Builds on every push to `main`, not by this workflow.

## Environment variables

Set in the Workers Builds settings (Settings, Build, Variables and secrets);
locally, export them before `bun run build`. They are read in Node when
`astro.config.ts` loads, because pages are prerendered in workerd.

| Variable | Effect |
| --- | --- |
| `PUBLIC_CF_WEB_ANALYTICS_TOKEN` | Site token from Cloudflare Web Analytics (32 hex characters). When set, every page loads the cookieless beacon from `static.cloudflareinsights.com`; when unset, no analytics script is added. A malformed value fails the build. Use either this variable (manual snippet setup) or the dashboard's automatic injection, not both, or the beacon loads twice. |
| `WORKERS_CI_COMMIT_SHA` | Set by Workers Builds; the commit shown in the footer. |

## Licensing

- **Code** is licensed under the [MIT License](./LICENSE).
- **Content** (texts, CV files, images, and page prose in Spanish and English)
  is © Manuel Sepúlveda, all rights reserved. See
  [`LICENSE-CONTENT.md`](./LICENSE-CONTENT.md).

If you reuse the code, replace the content with your own.

## Decisions

Architecture decisions are recorded in [`docs/decisions/`](./docs/decisions/).
