---
status: accepted
date: 2026-11-06
decision-makers: Manuel Sepúlveda
---

# Plain CSS with design tokens and IBM Plex, provisional "Ledger" palette

## Context and Problem Statement

The site needs light and dark themes, readable type in Spanish and English,
and a look that is the author's own rather than a framework default. How are
styles written and which typefaces are used?

## Decision Drivers

- A small site (under twenty templates) that should stay easy to read.
- Recognizable template defaults (utility classes with a component kit,
  indigo palettes, Inter) are what reviewers notice as generic.
- Contrast must pass WCAG AA in both themes.
- No third-party font requests (privacy and performance).

## Considered Options

- Plain CSS with custom-property tokens, cascade layers and scoped component styles
- Tailwind CSS
- Tailwind CSS with a component kit

## Decision Outcome

Chosen option: "Plain CSS with tokens". Semantic tokens in
`src/styles/tokens.css` resolve per scheme with `light-dark()`; components
use only the semantic names. Type is IBM Plex Sans and IBM Plex Mono, self-hosted
through Astro's Fonts API (latin and latin-ext only), with the mono face for
data such as dates, stack and statuses.

The palette, "Ledger" (ink on paper in light mode, deep green in dark mode,
amber only for emphasis), is provisional: a design pass at the end of the
first cycle may change values, not token names.

### Consequences

- Good, because a palette change touches one file; the favicon, touch icon
  and Open Graph images read the same tokens (a test keeps hard-coded colors
  in sync).
- Good, because there is no CSS framework to learn or upgrade, and no class
  soup in the markup.
- Bad, because spacing and type scales had to be defined by hand (Utopia
  fluid scales in `tokens.css`).
- Neutral, because the design pass may replace the palette; this ADR stays
  valid as long as the mechanism (semantic tokens) does.

### Confirmation

Components reference `--color-*` tokens only; Lighthouse accessibility
(contrast included) is asserted at 0.95 or more in CI.

## Pros and Cons of the Options

### Tailwind CSS

- Good, because it is fast to write.
- Bad, because the default scale and palette are recognizable and the markup
  is harder to read for a small site.

### Tailwind CSS with a component kit

- Bad, because it is the most recognizable template look and adds a
  dependency tree out of proportion with the site.
