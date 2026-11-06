---
title: Pulso Fiscal
summary: Open transparency platform that turns the Chilean Senate's operational expenses into comparable rankings and tables.
outcome: "MVP with Senate data since 2021: every datum keeps its source URL, capture date and SHA-256 hash. Paused since June 2026."
order: 2
year: "2026"
status: mvp
role: Design and development of all of it (Python ETL, Supabase database, Next.js site and docs)
team:
  size: 1
stack:
  - Python 3.12
  - uv
  - httpx
  - Polars
  - PostgreSQL (Supabase)
  - Cloudflare R2
  - Next.js
  - TypeScript
  - Tailwind CSS
links:
  repo: https://github.com/mansep12/pulso-fiscal
license: Code MIT, data CC-BY-4.0
featured: true
---

Pulso Fiscal is an open platform for anyone to review and compare the operational expenses the Chilean Senate publishes, with every figure traceable to the official source.

## Problem

Public data is not the same as accessible data. The Senate publishes each senator's operational expenses on its Transparencia Activa page, month by month, in a format that is hard to review and compare. The subject matters to the public: in March 2026, for example, [BioBioChile published a report](https://www.biobiochile.cl/especial/bbcl-investiga/noticias/articulos/2026/03/25/mas-de-300-millones-al-mes-en-combustible-quienes-son-los-senadores-que-mas-gastan-en-traslado.shtml) on the senators who spend the most on travel.

I wanted a tool that takes the data as the Senate publishes it, turns it into rankings and tables, and shows where every number comes from, so anyone can check it instead of trusting me.

## Constraints

- **Time.** A personal side project. The first commit is from May 24, 2026 and the last code change from June 19. It has been paused since.
- **Team.** Just me.
- **Source.** A single one: the public JSON API behind the Senate's expenses page. It is not documented as an API, so it can change URL or format, and the data can be incomplete.
- **Domain.** This is data about public officials. The project measures and shows; it does not accuse. A high amount does not by itself imply any irregularity, and no unnecessary personal data (national ID, address, phone) is published.

## Decisions

### The Senate only, for now

The broader idea is to explain, in plain language, public data nobody uses. Opening several sources at once was the obvious alternative; I dropped it and wrote the scope down in `docs/decisiones.md` (Senate, operational expenses, since January 2021) to avoid premature scope changes.

### Provenance per datum, raw files outside Git

Each downloaded response is stored as is, with its source URL, UTC capture date and the SHA-256 of the body, and every row of the normalized CSV carries those columns. Raw and processed files go to Cloudflare R2, not to the repository. The cost is depending on external storage to reproduce a run.

### Monthly average instead of totals

Comparing totals puts whoever has more published months at the top. The default ranking uses `total_monto / meses_con_datos`, counting only months with at least one comparable record. Rows that are not safe to add up are flagged and excluded: empty amounts, amounts embedded in text, duplicate `source_id`s, and negative adjustments, reported separately.

### No run is published without a public manifest

The rule lives in three layers. The normalizer runs a quality gate that stops the run if, for example, months are missing from the public range or duplicates disagree. The loader requires the run's manifest to be published on R2 and checks that it matches the local run before it opens a database connection. A Postgres constraint keeps a run marked `ok` from lacking a manifest URL. There is no local bypass. The cost: without R2 nothing can be loaded.

### The site only sees views

Base tables have RLS on and no grants for Supabase's public roles. The only public surface is seven views over the latest good run and three aggregate SQL functions. Rolling back a run means setting its status to `error`; the views fall back to the previous run on their own. The cost is that every new query needs its own view or function and an explicit grant.

## Architecture

`etl/` holds the Python pipeline: a scraper that downloads the API and writes a download manifest, a normalizer that produces the clean CSV, the monthly ranking, categories and a quality report, and a loader for Supabase. `supabase/migrations/` has five versioned migrations. `web/` is the Next.js app: ranking, a page per senator, methodology and sources. The diagram below follows a run from the Senate to the site.

## Result

**Every published row can be traced to the exact Senate response it came from: URL, capture date and SHA-256.** No run reaches the site without passing the quality gate and without a public manifest describing it.

- Senate data from January 2021 to the latest load.
- 29 automated tests in the ETL, for the scraper, the normalizer and the loader checks.
- Methodology, sources, decisions and a publish and rollback runbook in `docs/`.

## What I would change

- **Ship it.** The MVP has no public deployment; domain and hosting were deferred. Without a URL, only someone who clones the repository sees the provenance. That comes first when I pick it up.
- **Manual loads.** A run is published by running two commands by hand. I would schedule it, with the same gate and manifest requirement.
- **Unvalidated constraints.** The quality constraints were added as `NOT VALID` so existing data would not block them; Postgres enforces them only on new or updated rows. After a full reload I would validate them.
- **No tests for the site.** The ETL has them; the site only has `typecheck`.

## How to verify this

- **Code:** [github.com/mansep12/pulso-fiscal](https://github.com/mansep12/pulso-fiscal), code MIT and data CC-BY-4.0. The history shows the working dates and the pause.
- **Provenance:** the scraper (`etl/src/pulso_fiscal/scrapers/senado_gastos_operacionales.py`) stores URL, date and SHA-256 per response; the quality gate is `enforce_quality_gate` in the normalizer; the loader (`etl/src/pulso_fiscal/loaders/supabase.py`) validates the public manifest before connecting.
- **Database:** `supabase/migrations/20260603000000_lockdown_public_access.sql` locks the tables and `20260605020000_require_public_manifest_for_ok_runs.sql` adds the manifest constraint.
- **Run it:** from `etl/`, `uv sync --group dev` sets up the environment and `uv run senado-gastos-operacionales --max-periods 1` downloads the first available period from the official source. Tests live in `etl/tests` and run with pytest.
- **Official source:** [senado.cl/transparencia/gastos-operacionales-senadores](https://www.senado.cl/transparencia/gastos-operacionales-senadores), to check any figure against its origin.
- **No demo:** there is no published version; the repository links no deployment.
