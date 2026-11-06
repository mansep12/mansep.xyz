---
status: accepted
date: 2026-11-06
decision-makers: Manuel Sepúlveda
---

# CV data in JSON with stable highlight ids, rendered as HTML and printed to PDF

## Context and Problem Statement

The site needs a CV that visitors can read and download, in Spanish and
English. A later stage generates CVs tailored to a job offer with an LLM.
Where does CV data live and how does it become a document?

## Decision Drivers

- One source for the CV, the About page and the future generator.
- The generator must only select real achievements, never write new ones.
- No personal contact data beyond what the site already publishes.
- Easy to keep both languages in step.

## Considered Options

- JSON Resume shaped data, rendered as HTML, printed to PDF by the browser
- Publish the existing LaTeX PDFs
- Generate PDFs at build time (headless browser or a PDF library)

## Decision Outcome

Chosen option: "JSON Resume shaped data rendered as HTML". The CV lives in
`src/data/resume.{es,en}.json`. Every highlight is `{ id, text }`, with ids
that are stable across edits and identical in both locales
(`dimacofi.rpa.01`), so a tailored CV is a list of ids the code can verify.
The schema (`src/data/resume.schema.ts`) rejects a phone number and a street
address. `CvDocument` renders the data on screen and as A4 in print; the
download button opens the browser's print dialog.

The existing LaTeX PDFs are not published: they contain personal contact data
that the site does not show and an outdated headline.

### Consequences

- Good, because About and CV cannot disagree, and the generator's output can
  be checked id by id.
- Good, because the printed CV uses the same fonts and tokens as the site.
- Bad, because the PDF depends on the visitor's browser print engine, so
  page breaks are tuned with print CSS rather than fixed.
- Bad, because the JSON Resume shape is extended (highlight objects,
  `summary` on education), so stock JSON Resume themes do not read it
  unchanged.

### Confirmation

The schema and a test check that ids are unique per locale and identical
across locales; the build fails on invalid CV data.

## Pros and Cons of the Options

### Publish the existing LaTeX PDFs

- Good, because they already exist.
- Bad, because they carry personal contact data and an outdated headline,
  and would drift from the site.

### Generate PDFs at build time

- Good, because the file is identical for everyone.
- Bad, because it needs a headless browser in the build or a second layout
  in a PDF library; deferred until the generator stage measures the cost.
