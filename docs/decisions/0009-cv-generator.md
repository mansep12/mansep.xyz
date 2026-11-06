---
status: accepted
date: 2026-11-06
decision-makers: Manuel Sepúlveda
---

# CV generator: verified highlights, selected by Claude, printed by the browser

## Context and Problem Statement

The CV page (`/cv`, `/en/cv`) shows one CV for everyone. A visitor who is
hiring for a specific role (a tech lead, a recruiter) would rather read the
parts that matter for that role. A language model can pick and order those
parts, but a CV is a set of claims about a real person: a model that writes
free text can invent an employer, a metric or a technology, and a public form
that calls a paid API can be abused.

How do we offer a CV tailored to a pasted job posting, on a static site on
Cloudflare Workers, without letting the model add facts and without an
unbounded bill?

## Decision Drivers

- No invented facts: name, contact details, dates, employers, degrees,
  project names and links never come from the model.
- Abuse and cost are bounded per visitor and per day, with a kill switch.
- The pasted text is not stored; the privacy page says exactly what is sent
  where.
- The site stays static: only `/api/cv` runs Worker code.
- The tailored CV looks exactly like the full one, on screen and in print.
- Runs on the Workers Free plan (10 ms of CPU per request).

## Considered Options

Architecture:

1. **Selection over a verified catalog.** The model receives the resume's
   highlights, each with a stable id (`dimacofi.rpa.01`), and returns ids, a
   light rewrite of each and a short summary, through a fixed JSON schema.
   Code validates the answer and builds the CV from the resume JSON.
2. Free-form generation of the whole CV from the resume and the posting.
3. No model: keyword matching between the posting and the highlights.

Counters: a Durable Object; the Workers Rate Limiting binding plus KV; D1.

PDF: the browser's print dialog; Browser Rendering; Typst compiled to WASM
in the Worker; pdf-lib.

Rendering of the tailored CV: Astro's Container API in the Worker; a
client-side renderer that copies `<CvDocument>`'s markup.

## Decision Outcome

Chosen: **option 1, selection over a verified catalog**, with a cheap
screening call before it, a validator after it, a Durable Object for the
daily budget, the Container API to render the same `<CvDocument>`, and the
browser's print dialog for the PDF. Option 2 cannot guarantee "no new facts";
option 3 picks poorly on short or paraphrased postings.

### Request flow (`POST /api/cv`)

`src/pages/api/cv.ts` (the only route with `prerender = false`) wires the
Worker environment into `src/lib/cv-generator/handler.ts`, which runs, in
order:

1. **Feature flag**: `CV_GENERATOR_ENABLED=true` and both secrets present,
   else `503 {"error":"disabled"}`.
2. **Request checks**: `POST` only (405), same origin when an `Origin`
   header is sent (403), `application/json` (415), body up to 16 KiB read
   with a hard limit (413), strict JSON shape (400): `lang` in `es`/`en`,
   `jobText` of 30 to 6000 characters after normalization, `focus` from a
   fixed list of four chips, a Turnstile token of at most 2048 characters.
3. **Turnstile** (Siteverify with the secret and the visitor IP): the token
   must be valid and unused (Cloudflare enforces single use and the 300 s
   lifetime), issued on an allowed hostname (`TURNSTILE_HOSTNAMES`, default
   `mansep.xyz`) and, when Siteverify returns one, for the `cv-generator`
   action. Failure is 403; Siteverify down is 503.
4. **Budget**: at most `CV_DAILY_LIMIT` (default 40) generations per UTC day
   for the site and `CV_PER_IP_DAILY_LIMIT` (default 3) per visitor; 429 with
   `Retry-After` until midnight UTC. Every attempt that reaches this step
   counts, since every later step can cost money.
5. **Screening** with Claude Haiku 5.5: `{is_job_description,
   injection_suspected, language}`. Not a job or role: 422
   `not_a_job_description`. Instructions aimed at a model, or a refusal from
   the screening model: 422 `input_rejected`.
6. **Selection** with Claude Sonnet 5.5 (below).
7. **Validation** of the selection (below), then the tailored resume is
   built from the resume JSON (`tailor.ts`) and rendered.
8. **Response**: the tailored resume (same shape as the resume schema),
   section order, rationale per item, which items kept their rewrite, the
   disclosure line, the rendered HTML and the tries left today. Model errors
   map to 504 (timeout), 503 (rate limited or overloaded), 422 (declined) or
   502.

Logging: one JSON line per request that passed step 2, with the time, the
language, the SHA-256 of the text, token usage per call, the outcome and the
selected ids. Never the text, the IP or a model string (a model-invented id
could echo the posting, so only counts of validator issues are logged).

### Models (verified on 2026-11-06)

From the [models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
and [pricing](https://platform.claude.com/docs/en/about-claude/pricing):

| Use | Model id | Input / output per MTok |
| --- | --- | --- |
| Screening | `claude-haiku-5-5` | USD 0.10 / 0.50 (prompts up to 100k tokens) |
| Selection | `claude-sonnet-5-5` | USD 2 / 10 |

Both run with adaptive thinking (the default) at `output_config.effort:
"low"`: screening is classification and selection is ranking about twenty
items, neither needs long reasoning, and low effort keeps latency and output
tokens down. Claude Opus 5.5 (USD 4 / 20) would double the cost for a task
this small. The selection call uses server-side fallback (`fallbacks:
"default"`, beta header `server-side-fallback-2026-07-01`): a posting for an
offensive security role can trip the cyber classifier, and the default
routing retries such declines on the model Anthropic recommends. Claude
Haiku 5.5 has no server-side fallback, so a screening refusal counts as a
rejection, as Anthropic's guide on
[mitigating jailbreaks](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks)
recommends for harmlessness screens.

The official TypeScript SDK (`@anthropic-ai/sdk`), which supports Cloudflare
Workers, makes both calls with `maxRetries: 1` and per-call timeouts (15 s
and 40 s). `ANTHROPIC_BASE_URL` can point it at Cloudflare AI Gateway.

### Prompt and structured outputs

[Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
(`output_config.format` with a JSON schema, generally available, no beta
header) constrain both answers. Every object has `additionalProperties:
false`; ids are `enum`s built from the catalog, so the selection cannot even
name an id that does not exist. Length limits (`maxLength`, `maxItems`) are
not supported by structured outputs and are enforced by the validator.

The system prompt holds the policy and the verified data: the highlights as
JSON, the profile summary and the skills. The pasted text goes in the user
turn as a JSON string inside `<job_posting_json>`, with `<`, `>` and `&`
escaped so it cannot close the block, followed by our own instruction in a
separate block (language and focus chips, both from fixed lists). The policy
says the posting is untrusted data, never instructions. This follows the
guide above (JSON-encode untrusted content, state the policy in the system
prompt, keep our instructions out of the data block). The prompt is the
first line of defense; the validator is the boundary.

### Validator (`validate.ts`)

The selection is parsed as untrusted JSON:

- Unknown ids are dropped (ids compared case-insensitively), duplicates are
  dropped, each item goes to the section its highlight belongs to, at most 6
  items per section and 10 in total.
- A rewrite is checked against its own highlight plus the verified name and
  keywords of its employer or project. It falls back to the original text if
  it is empty, under 25 or over 380 characters (or 40 more than the
  original), contains markup, a link or an email address, a number or
  percentage that is not in the source (also spelled-out numbers), a
  capitalized name or a technology (a list of common lowercase names) that is
  not in the source, an injection phrase ("ignore", "instructions", "hire"),
  an inflating word ("expert", "senior", "led", "years"), or too much new
  wording (more than 35 % or 6 content words whose stem is not in the
  source). Skills from the skills list are not allowed in a highlight that
  does not mention them, which is stricter than the skills list as a whole:
  it would let a rewrite attach Rust to a project built without it.
- The summary may draw on the highlights it cites, the profile summary, the
  skills list and the label, with the same checks (looser on new wording);
  otherwise the resume's profile summary is used.
- Rationale entries are kept only for selected items, at most 220
  characters, without markup.

The checks are heuristics that fail closed: a false positive costs a
rephrasing (the original, verified text is shown), a false negative would
put an unverified claim on a CV. Em and en dashes are normalized to commas.

### Abuse and cost controls

- **Turnstile**, explicit render, loaded only when the visitor focuses the
  form; a fresh token per request.
- **Durable Object** `CvBudget` (SQLite storage backend, available on the
  Free plan), one instance named `global`, so every count is serialized.
  The logic (`budget.ts`) runs against a synchronous store in tests; the
  class (`src/durable-objects/cv-budget.ts`) adapts it to `ctx.storage.kv`
  inside `transactionSync` and sets an alarm that deletes every counter at
  the end of the UTC day. Visitors are keyed by a truncated SHA-256 of the
  day and the IP, computed in the Worker, so the object never sees an IP and
  keys cannot be linked across days.
- **Kill switch**: `CV_GENERATOR_ENABLED` is a dashboard variable kept
  across deploys (`keep_vars: true` in `wrangler.jsonc`), so turning it off
  takes effect without a deploy; `CV_DAILY_LIMIT=0` also stops generation.
  The secrets are deliberately not in `secrets.required`: that would make
  every deploy fail until they are set, even with the generator off.
- **Spend limit** in the Anthropic Console as the last line (USD 15 a
  month).

Exporting a Durable Object needs a custom Worker entrypoint. The
`@astrojs/cloudflare` adapter supports one: `src/worker.ts` exports the
class and forwards `fetch` to `handle` from `@astrojs/cloudflare/handler`
([adapter docs](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)),
and `wrangler.jsonc` points `main` at it. The adapter's build-time prerender
worker drops Durable Object bindings, so prerendering is unaffected. Static
pages are still served from assets without running the Worker
(`run_worker_first` is not set); unknown paths reach the Worker and fall
back to the 404 page.

### Rendering and PDF

The Worker renders the tailored resume with the same `<CvDocument>`
component through Astro's Container API (`experimental_AstroContainer` from
`astro/container`, which works in workerd for components without framework
renderers). `<CvDocument>` gained three optional props: section order,
source ids next to each highlight (screen only) and a footnote with the
disclosure. The `/cv` page already ships the component's scoped CSS, so the
fragment needs no styles of its own; script tags are stripped from it. The
page inserts the fragment in place of the full CV, so the existing print
styles and the browser's "Save as PDF" produce an A4 PDF identical in design
to the static one, with selectable text and working links.

A server-side PDF was rejected for now: on the Free plan a Worker gets 10 ms
of CPU per request. Typst compiled to WASM and pdf-lib need far more CPU
than that (Workers Paid, USD 5 a month) and pdf-lib would duplicate the
layout by hand; Browser Rendering adds a binding, its own limits and seconds
of latency for what the visitor's browser already does.

### Costs

Measured prompt sizes: the selection system prompt is about 9,400
characters (Spanish) and the schema about 2,800, roughly 3,000 to 3,500
input tokens with the structured-output overhead, plus 700 to 1,800 tokens
of posting. The output is 1,000 to 2,500 tokens (JSON plus brief thinking at
low effort). Screening reads under 2,500 tokens and writes under 300.

| Call | Typical | Worst case |
| --- | --- | --- |
| Screening (Haiku 5.5) | under USD 0.001 | USD 0.001 |
| Selection (Sonnet 5.5) | about USD 0.025 | about USD 0.04 |
| Per generation | about USD 0.03 | about USD 0.045 |

At the default limit of 40 generations a day the ceiling is about USD 1.80 a
day; the USD 15 monthly spend limit allows roughly 350 to 500 generations a
month. A posting rejected by screening costs a tenth of a cent. Prompt
caching is not enabled: at this traffic a 5-minute cache would mostly pay the
1.25x write price without reads; it is the first lever if traffic grows.

### Consequences

- Good, because nothing on a tailored CV is unverified: identity and
  history come from the JSON, and every highlight is either a checked
  rewrite or the original text.
- Good, because cost and abuse are bounded by Turnstile, two daily limits, a
  kill switch and a spend limit.
- Good, because the tailored CV and the full CV share one component, one
  print stylesheet and one PDF path.
- Bad, because the validator rejects some harmless rephrasings (for
  example a new neutral verb at the start of a sentence); the original text
  is shown instead.
- Bad, because the first render in a fresh isolate measured about 9 ms of
  wall time in `wrangler dev` (1 to 2 ms warm), close to the Free plan's
  10 ms CPU limit. If `1102` errors appear, the options are Workers Paid or a
  client-side renderer.
- Neutral, because the progress states in the form are timed, not reported
  by the server.

### Confirmation

- Unit tests (`tests/cv-generator/`) cover the catalog, schemas and prompts,
  the validator with adversarial cases (invented employer, metric,
  technology, unknown id, echoed injection), the SDK client with a fake
  `fetch`, Turnstile, the budget, input caps, the handler's status codes and
  logs, and the rendering through the Container API.
- A local end-to-end run uses `wrangler dev`, Cloudflare's always-pass
  Turnstile test keys and a fake Anthropic API (`tests/e2e/mock-anthropic.ts`);
  see the README.
- Before launch: 10 to 15 real postings, each tailored CV reviewed by hand.

## More Information

- Builds on [ADR 0006](./0006-cv-data-as-json-rendered-to-html.md) (CV data
  as JSON with stable highlight ids) and works within
  [ADR 0007](./0007-security-headers-and-csp.md): the CSP already allows the
  Turnstile script and frame, and the generator's fetch is same-origin.
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
  and [testing keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [Anthropic API data retention](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-commercial-api-data)
