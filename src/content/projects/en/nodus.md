---
title: Nodus
summary: Multilateral debt netting for SMEs on Stellar, with atomic settlement and passkey-controlled accounts.
outcome: "1st place, University Track, at Find Your Way Hackathon. On testnet, a cycle of 20 businesses settled in a single transaction with 20 passkey signatures."
order: 1
year: "2026"
status: done
role: Design and development of the whole product (contracts, backend, web app, end-to-end tests, deployment and docs)
team:
  size: 2
  note: with Felipe Jara Ribet
event:
  name: Find Your Way Hackathon (Tellus and Stellar), October 2026
  award: Best University Project (1st place, University Track)
stack:
  - Rust
  - Soroban SDK
  - TypeScript
  - Next.js 16
  - React 19
  - PostgreSQL
  - Drizzle ORM
  - OpenZeppelin smart accounts
  - OpenZeppelin Relayer
  - WebAuthn (passkeys)
  - Bun
links:
  repo: https://github.com/mansep12/nodus
  demo: https://nodus-stellar.vercel.app
  video: https://www.youtube.com/watch?v=HY0Obkx1N60
  youtubeId: HY0Obkx1N60
license: MIT
featured: true
---

Nodus is an app for small businesses that owe each other money in circles: it finds those circles, cancels every debt at once and moves only the net balance, with each business signing its own part with a passkey.

## Problem

In Chile the law gives 30 days to pay an invoice, but the real average is 44, and between small businesses it reaches 53. Delays come in chains: whoever owes you is also waiting to be paid.

Many of those debts form circles. The bakery owes the mill 100, the mill owes the carrier 80 and the carrier owes the bakery 90. Settling all of it cancels the 270 by moving 20: the bakery and the carrier pay 10 each and the mill receives 20. Without moving money, what the three debts have in common is deducted: 240 is cancelled and debts of 20 and 10 stay open. Either way no one ends up better or worse off.

## Constraints

- **Time.** I built it for Find Your Way Hackathon, run by Tellus on Stellar. The repository has 53 commits between October 5 and 10, 2026, and the submission required a video of three minutes at most.
- **Team.** Two people, with Felipe Jara Ribet. I designed and wrote the product.
- **Stack.** The hackathon asked for significant use of Stellar, so the core is a Soroban contract in Rust.
- **Domain.** Money between businesses: a settlement happens in full or not at all, and no one may sign something other than what they see.

## Decisions

### A contract instead of a clearing house

Netting debts is not new, but there is always someone in the middle: a clearing house, or a factoring company that buys the invoice at 1% to 2.2% a month. I dropped that intermediary because on Stellar it can be an open source contract that keeps nothing. `settle` computes each party's net, calls `require_auth` for every party and moves the nets, all in one transaction: if a signature is missing or someone cannot cover their net, nothing changes.

### The contract computes the nets; the solver is not trusted

Circle search runs off-chain, inside the app, over cycles of up to 8 businesses with a 2 second budget. Off-chain it can be wrong, so the contract does not accept nets: it computes them and validates every debt again. A bad solver can only propose something nobody signs or the contract rejects.

### Passkey accounts, no seed phrases

Each business is an OpenZeppelin smart account controlled by a passkey, so it signs from its own device with no seed phrases or extensions. An accountant's passkey can be added, limited by a custom policy (`contracts/allowlist`) to registering, accepting and rejecting debts. The cost: the policy only checks the function name.

### Fees paid by a relayer

No business should have to buy XLM to sign a netting, so every transaction goes through OpenZeppelin Relayer (Channels), which pays the fee. The cost: `/api/relay` sponsors any call to Nodus with per-IP limits only, fine on testnet and not on mainnet.

### The browser checks what it signs

The server builds the proposal and stores signatures, but it does not decide what gets signed. Before asking for the passkey, `assertMatches` checks that the entry invokes `settle` with exactly the debts on screen and that the only transfer is the net shown; the server verifies each signature before forwarding it. The cost is privacy: the browser receives every debt in the circle, so hiding third parties in the UI is presentation only.

## Architecture

It is a Bun monorepo. The contract (`contracts/nodus`) is the source of truth and emits an event for every change. The Next.js app holds the UI and the `/api` routes, where the indexer (contract events to Postgres) and the solver run; there are no separate processes besides a daily cron. Each party signs its entry in the browser, and with the last signature a single request sends the settlement to the relayer. The diagram below shows what runs where.

## Result

**A cycle of 20 businesses settled on testnet in a single transaction, with 20 passkey signatures.** It used 33% of the compute and 44% of the size the network allows per transaction.

- A circle of 3 was settled without moving money from the web app, with the fee paid by the relayer.
- It won Best University Project, 1st place in the University Track.
- The demo runs on testnet with example worlds of 11 real accounts each.
- Contract, solver, indexer, signature and UI tests, plus end-to-end tests against testnet; CI runs lint, typecheck, unit tests and the build.

## What I would change

- **Privacy.** Every debt lives in public contract events, and a debt's reference is an unsalted SHA-256, so a short invoice number can be brute-forced. I would salt it and decide whether third-party amounts may reach the browser at all.
- **Where debts come from.** Today the parties declare them and identity is not verified. I would take them from electronic invoices registered with the SII, Chile's tax service.
- **Before mainnet.** A per-account quota and budget for the relayer, and revocable sessions.
- **Bigger circles.** The app proposes up to 8 businesses; the 20-business cycle was built with a script.

Nothing is audited; the assumptions to review are in `docs/seguridad.md`.

## How to verify this

- **Code:** [github.com/mansep12/nodus](https://github.com/mansep12/nodus), MIT. Contract in `contracts/nodus/src/lib.rs`, signing checks in `apps/web/src/lib/actions.ts`, passkey verification in `packages/stellar/src/passkey.ts`.
- **Testnet transactions:** the [20-business cycle](https://stellar.expert/explorer/testnet/tx/da968b3a8e5ec4a1008d67e5f6ef1bc9df330bf922fbb0e58862245558039b63) and the [3-business circle with no money moved](https://stellar.expert/explorer/testnet/tx/a2f068a9bf2dbdf736ddabf5860edcce487f0bf3230af49e246881f819558fdd). Testnet is reset from time to time; `bun run e2e:settle 20` repeats the 20-business measurement.
- **Demo:** [nodus-stellar.vercel.app](https://nodus-stellar.vercel.app), on testnet with a test asset, not real USDC.
- **Run it:** with Bun, Rust (`wasm32v1-none` target) and the Stellar CLI: `bun install`, `bun run contract:build`, `bun run contract:test`, `bun run test`. With the relayer key in `packages/e2e/.env`, `bun run deploy:testnet` deploys token, contract and policy.
- **Video:** the [pitch on YouTube](https://www.youtube.com/watch?v=HY0Obkx1N60), in Spanish. In its demo the businesses are scripted test accounts and the browser's virtual authenticator answers the passkey prompts; the transactions are real.
