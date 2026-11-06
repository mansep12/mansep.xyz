---
status: accepted
date: 2026-11-06
decision-makers: Manuel Sepúlveda
---

# Record architecture decisions

## Context and Problem Statement

This repository holds the personal site of Manuel Sepúlveda. It will grow in
stages (static portfolio first, then project pages, then a CV generator backed
by a Worker endpoint). Several technical choices have real alternatives, and
the reasons behind them are easy to forget. How do we keep a durable,
reviewable record of those decisions and their rationale?

## Decision Drivers

- Decisions should be traceable months later, by the author or by a reviewer.
- The record should live next to the code and change through the same review
  flow (pull requests, Conventional Commits).
- Low overhead: writing a record should take minutes, not hours.
- The records are also portfolio material, so they must be readable by people
  outside the project.

## Considered Options

- Architecture Decision Records in Markdown using MADR, stored in
  `docs/decisions/`.
- Free-form notes in the README.
- No written record (rely on commit messages and memory).

## Decision Outcome

Chosen option: "Architecture Decision Records in Markdown using MADR", because
it is lightweight, versioned with the code, and has a well-known structure that
readers recognise.

Rules:

- One file per decision: `docs/decisions/NNNN-short-title.md`, numbered
  sequentially and never renumbered.
- Written in English, using the [MADR](https://adr.github.io/madr/) template.
- Every technical decision with real alternatives gets an ADR.
- Accepted ADRs are not rewritten. A change of mind is a new ADR that marks the
  old one as "superseded by ADR-NNNN".

### Consequences

- Good, because the reasoning behind the stack and structure is preserved and
  reviewable.
- Good, because ADRs double as public examples of how decisions are made.
- Bad, because each significant change needs a short extra document.

### Confirmation

Pull requests that introduce a technical decision with alternatives include a
new ADR in `docs/decisions/`. This is checked during review.

## Pros and Cons of the Options

### ADRs in Markdown (MADR)

- Good, because the format is standard and tool-agnostic.
- Good, because the files live in the repository and follow the git workflow.
- Neutral, because the template has optional sections that can be skipped.
- Bad, because it adds a small writing cost per decision.

### Free-form notes in the README

- Good, because there is a single place to read.
- Bad, because the README grows without structure and history gets lost.

### No written record

- Good, because it costs nothing up front.
- Bad, because the rationale disappears and decisions get reopened.

## More Information

- MADR: https://adr.github.io/madr/
- Michael Nygard, "Documenting Architecture Decisions" (2011).
