---
status: accepted
date: 2026-11-07
decision-makers: Manuel Sepúlveda
---

# contact@mansep.xyz as the public contact address

Supersedes [ADR-0008](./0008-contact-email.md).

## Context and Problem Statement

ADR-0008 kept the personal Gmail on the site until Cloudflare Email Routing was
active. Routing is now active, with MX, SPF and DKIM records published, and
DNSSEC signs the zone. Which address should the site and the CV show?

## Decision Outcome

Chosen option: `contact@mansep.xyz`, forwarded by Cloudflare Email Routing to
the personal inbox.

- `contact` is neutral in both locales; `hola` or `contacto` read as Spanish
  only on the English pages.
- The public address no longer depends on a mail provider: changing inboxes
  means changing the routing destination, not the site.
- Catch-all stays disabled, so made-up addresses on the domain bounce.

### Consequences

- Good, because the personal Gmail is no longer published on the site.
- Neutral, because replies are sent from the personal inbox. Email Routing
  only receives; sending as the domain would need an SMTP provider.
- Bad, because `.xyz` has weaker reputation in corporate spam filters, so job
  applications keep going out from the personal inbox (see ADR-0008).
