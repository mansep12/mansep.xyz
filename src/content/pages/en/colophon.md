---
title: "Colophon"
description: "How this site is built and why: Astro, Cloudflare Workers with static assets, plain CSS with tokens, self-hosted IBM Plex and routes in two languages."
---

This site is static: each page is generated once, at build time, and served as a file. There is no database and no server assembling each visit, so it loads fast and needs little upkeep.

## How it is built

- **[Astro](https://astro.build)** generates the pages. The site is content, and Astro outputs HTML with no JavaScript except where it is needed (the theme, the email address, the CV button). Texts and project write-ups go through schemas: if a project lacks a link to its code or a demo, the build fails.
- **[Cloudflare Workers](https://developers.cloudflare.com/workers/) with static assets** serves the files. The free plan covers what the site needs, the domain and DNS live in the same account, and I had already used Workers in Pulso Urbano.
- **Plain CSS with tokens**, no framework. The site is small and its CSS fits in a few files. Colors are defined once per theme with `light-dark()`; the theme follows the system unless you choose another one.
- **IBM Plex Sans and IBM Plex Mono**, hosted on the site itself instead of loaded from a font service. They are one family, and the mono face marks what is data: dates, stack, statuses.
- **Two languages with their own routes**: Spanish at the root and English under `/en/`, because both teams in Chile and teams that work in English read it. Each page links to its version in the other language, with no automatic redirect.
- **The CV** comes from a JSON file in the JSON Resume shape, the same one behind the experience on the About page, so there is one source for both.

Visits are measured with Cloudflare Web Analytics, without cookies. The details are on the [Privacy](/en/privacy) page.

## Code and version

The code is public at [github.com/mansep12/mansep.xyz](https://github.com/mansep12/mansep.xyz). The footer of every page shows the commit the site was built from, with a link to GitHub, so you know exactly which version you are reading.

## Licenses

The code is under the [MIT License](https://github.com/mansep12/mansep.xyz/blob/main/LICENSE). The content (texts, CV and images) is all rights reserved; the details are in [LICENSE-CONTENT.md](https://github.com/mansep12/mansep.xyz/blob/main/LICENSE-CONTENT.md).
