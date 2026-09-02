# Feature Specification: The Powerups boundary — a Powerup never signs

**Feature Branch**: to be created from `main` after the iOS submission (not `feat/redesign-mobile-home`) · spec dir `027-powerups-boundary`
**Created**: 2026-09-02 · **Status**: Draft for owner sign-off. **Not to be implemented from this session**: the owner schedules it on its own branch, first job after the iOS ship and before Swap returns, so Swap v2 is written inside the new structure instead of migrated twice.

Source of intent: SOT "Powerups — Contribution Model" and the 2026-09-02 Apple / legal research. Backend counterpart: the salmon-wallet-backend session mirrors the contract below (allowlist shape, error codes, provider field) before either side implements.

## The property

**Core owns keys, signing, secure storage, RPC broadcast and the confirmation screen. A Powerup only proposes a transaction; the core-rendered confirmation decides.** Today this is prose in the SOT; this spec turns it into a build property the compiler and the linter enforce.

## 1. Structure (`packages/shared/src`)

```
core/
  keys/            key material, derivation (today: crypto/, blockchain/*/account)
  signing/         the one signing entry point (see §2)
  storage/         vault + secure storage (today: storage/)
  broadcast/       RPC sends — Solana sendRawTransaction, Bitcoin relay (spec 025's client-side broadcast)
  confirmation/    the confirmation screen contract: counterparty, fee lines, typed data the Powerup fed it
powerups/
  registry.ts      one entry per Powerup per platform: id, title key, icon, routes (mobile / extension / web), `sections` it requires, activation rules
  swap/            screens, quote hooks, types, locales — moved AS-IS from today's SwapScreen/useSwapScreenLogic, marked "to be rewritten against the v2 contract"
  <next>/
```

Mobile and extension navigation read `powerups/registry.ts` and stop editing per-Powerup tab bars by hand (SOT estimate: ~550 lines / 15 files for registry + dynamic route + per-device activation). The Home sub-tab order (spec 023) reads the same registry for the keys it may offer.

Placement rules stay AGENTS.md's: cross-platform logic in shared, DOM in `packages/ui`, RN in `apps/mobile`. `powerups/<name>/` holds only what is Powerup-specific; anything two Powerups share climbs to `core/` or to the kit.

## 2. Enforced boundary

- An ESLint rule (`eslint-plugin-boundaries` or `no-restricted-imports` with path patterns, whichever the repo already carries — check `eslint.config.*`) **fails the build** when anything under `powerups/**` imports `core/signing/**`, `core/keys/**`, `core/storage/**`, `crypto/**`, or any keypair / mnemonic accessor (`getAccountMnemonic`, `signTransaction`, `BlockchainAccount.sign*`).
- Powerups reach signing through exactly one core function, e.g. `requestSignature(proposal: TransactionProposal): Promise<SignedResult>`, which **always** renders Salmon's confirmation screen — counterparty, every fee as its own line (the Salmon fee separate from the route's), the typed data the Powerup supplied — and only then signs and broadcasts through `core/broadcast`. No Powerup ever holds signed bytes.
- A test in shared asserts the rule fires (a fixture under `powerups/__fixtures__/` importing `core/signing` must fail lint).

## 3. Compile-time exclusion

- Build flag `EXPO_PUBLIC_POWERUPS` (`'on' | 'off'`, default `'off'` for the `production` EAS profile, `'on'` for dev/preview): when off, `powerups/**` is excluded from the bundle — a Metro/Babel alias to an empty registry, not a runtime `if` — so the submission `.ipa` carries **no swap / Jupiter strings, routes or locales**. The current runtime flag (`POWERUPS_SURFACE_ENABLED`, spec: submission build) stays for dev toggling and is removed once the build flag exists.
- The extension and web builds honour the same flag through their bundlers (WXT / Vite `define`).
- Verification: a script greps the built bundle for `jupiter` / `swap` and fails when the flag is off.

## 4. Kill switch and region gating (backend-driven, fail-closed)

The client reads the backend's capability matrix — `sections` in `GET /v1/networks`, fetched today and ignored — **plus a per-Powerup allowlist served alongside it**. A Powerup is enabled only when the registry entry's requirements are satisfied by the matrix **and** the allowlist admits it for this stage/network/region. A stored reference to a disabled Powerup (the extension's session-restored tab, spec note: a real crash path today) falls back to Home.

Region gating is **decided server-side from the request IP** (CloudFront-Viewer-Country / -Country-Region forwarded to the API). The client:

- **never requests device location permission** for this (an App Review red flag and unnecessary);
- treats store country / device region as secondary signals that may **hide** a Powerup early but never **unlock** one;
- never trusts its own country determination;
- **fails closed**: a `403 region_restricted` from the backend, or an unavailable allowlist, renders a proper "not available in your region" state (`StateBlock`, its own copy) — never a generic provider error, never a silent empty quote.

App Store Connect per-country availability is kept in sync with the allowlist by the owner; the spec records the dependency.

## 5. Wallet screening

The backend screens the wallet address against sanctions lists before quoting (Jupiter license §7.3). The client handles `403 wallet_restricted` as a state distinct from the region one (its own copy, no retry loop). No KYC, no identity collection, nothing stored client-side about the result beyond the current session's state.

## 6. Swap: moved now, rewritten later

- `powerups/swap/` receives today's swap module unchanged in logic, behind the boundary, marked `@deprecated — rewrite against the v2 contract`.
- The backend is deleting `GET /v1/solana-{env}/ft/swap/order` and `POST …/ft/swap/execute` (Jupiter Ultra deprecated; `/execute` was the last place the backend accepted signed bytes). Swap v2 will be a new endpoint backed by Jupiter `GET /swap/v2/build`: the backend sets `platformFeeBps` + `feeAccount` server-side and returns an **unsigned** transaction (or instructions); the client signs through §2, broadcasts through `core/broadcast`, and confirms the signature itself. No execute step; the shape differs from today's `order` / `requestId`. That rewrite is its own later spec.
- Jupiter license requirements the screen must meet when it returns: "Powered by Jupiter" and the API in use named on the swap screen; the Salmon fee shown as a separate line, never folded into the quote.

## 7. Multi-provider

The backend chooses the routing provider per request (Jupiter by default; 0x or DFlow are candidates for the US later, pending 0x's source list / pricing and a legal opinion). The client treats the provider as **data returned with the quote**: `provider: 'jupiter' | '0x' | 'dflow'` plus `providerDisplayName` and `attribution` strings, and renders attribution from them. No provider-specific UI branches, no provider API keys or calls from the device.

## Contract the backend mirrors

- `GET /v1/networks`: `sections` (existing) + `powerups: { [powerupId]: { enabled: boolean; networks: string[]; stages: string[] } }` (allowlist shape to be pinned with the backend spec).
- Errors: `403 region_restricted`, `403 wallet_restricted` (JSON `{ error, error_description }` as today's `ApiError` shape).
- Quote payload: `provider`, `providerDisplayName`, `attribution`, fee lines (`salmonFee`, `routeFee`) as separate fields.

## Out of scope

Marketplace / third-party runtime (SOT Model C stays closed); CLA / CODEOWNERS / governance (separate); the Swap v2 rewrite itself; Stake / Ramp Powerups (build hold stands).

## Verification (when implemented)

Lint fixture fails; bundle grep clean with the flag off; kill-switch and region/wallet 403 states covered by shared tests; mobile and extension navigation render from the registry; existing swap tests pass unchanged after the move.
