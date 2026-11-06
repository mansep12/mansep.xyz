---
status: accepted
date: 2026-11-06
decision-makers: Manuel Sepúlveda
---

# Personal Gmail as contact address until hola@mansep.xyz routing is active

## Context and Problem Statement

The site shows a contact email on every page and in the CV. The plan is a
domain address (`hola@mansep.xyz`) received through Cloudflare Email Routing
and forwarded to Gmail, but routing and its DNS records (MX, SPF, DKIM, DMARC)
are not set up yet. Which address does the site show meanwhile?

## Decision Drivers

- Every published address must deliver today.
- Applications and replies to recruiters already go out from Gmail, and the
  `.xyz` TLD has worse deliverability reputation for sending.
- Changing the address later should be a one-line change.

## Considered Options

- Show the personal Gmail address now, switch to `hola@mansep.xyz` once routing works
- Show `hola@mansep.xyz` now
- No address, only a contact form

## Decision Outcome

Chosen option: "Show the personal Gmail address now". It is defined once in
`src/data/site.ts` (and in the CV data), assembled in the browser from an
encoded string so it is not plain text in the HTML.

When Email Routing is active and tested, the site switches to
`hola@mansep.xyz` for receiving; sending (applications, replies) stays on
Gmail.

### Consequences

- Good, because no message sent from the site is lost.
- Bad, because the personal address is public and will collect some spam;
  the encoding only adds friction for naive scrapers.

### Confirmation

`site.email` is the only place the site address is set; switching is a change
to that line and to `basics.email` in the CV data.

## Pros and Cons of the Options

### `hola@mansep.xyz` now

- Bad, because mail would bounce until routing and DNS are in place.

### Contact form only

- Bad, because recruiters expect an address they can copy, and a form needs
  a Worker endpoint and bot protection first.
