# Implementation plan — 027 Powerups boundary

**Branch** `feat/powerups-foundations` · **Hold**: branch + draft PR only, no merge until the owner lifts it (2026-09-10).
Scope agreed with the owner: §1–3 of the spec, the mobile route re-wired, and
a DOM twin for the extension. §4 (allowlist) and §5 land only as the two
`403` states a Powerup renders.

## Decisions (the lazy reading of the spec)

- **§1 `core/`** adds only what does not exist: `core/broadcast` (the Solana
  sign-and-send path extracted from `prepared-transactions.ts`),
  `core/signing` (`requestSignature`, the one entry point) and
  `core/confirmation` (the proposal contract + the provider the platforms
  mount). `crypto/`, `storage/` and the account classes stay where they are —
  the lint rule names those paths; moving them buys no property.
- **§1 `powerups/`**: `registry.ts` (id, copy keys, tier, networks, the route
  key each platform maps), one folder per Powerup (types, API service,
  hooks, locales). The
  root `@salmon/shared` barrel does NOT re-export powerups; apps import
  `@salmon/shared/powerups` (`packages/shared/src/powerups/index.ts`), the one
  module the build flag aliases.
- **§2**: `no-restricted-imports` + `no-restricted-syntax` for
  `packages/shared/src/powerups/**`, `apps/*/src/powerups/**`,
  `packages/ui/src/powerups/**`: no `core/signing`, `core/broadcast`,
  `crypto`, `storage`, `@solana/kit` signing functions, no `.signer` /
  `.keyPair` member access. A Vitest test runs ESLint on a fixture and asserts
  the rule fires.
- **§2 `requestSignature(proposal)`**: the Powerup hands core an unsigned
  base64 transaction plus what the confirmation shows (exchange block, rows,
  attribution, `expiresAt`, `refresh()`); core renders the confirmation
  screen (`TransactionConfirmation`,
  one twin per platform), then signs + broadcasts + confirms through
  `core/broadcast` and resolves the signature. Cancel rejects. The Powerup
  never sees signed bytes and never calls the RPC to send.
- **§3**: `EXPO_PUBLIC_POWERUPS` (mobile, Metro `resolveRequest`) and
  `VITE_POWERUPS` (extension, Vite alias) replace `powerups/index.ts` with
  `powerups/index.off.ts` in shared, mobile and ui. Off = empty registry,
  `POWERUPS_ENABLED=false`, no Powerup locales (they live under each
  Powerup's `locales/` and are merged by the powerups module).
  `POWERUPS_SURFACE_ENABLED` is removed. `scripts/check-powerups-bundle.mjs`
  greps a built bundle for the markers.

## Status (2026-09-10)

A–F done on `feat/powerups-foundations`, every batch green on typecheck + lint + tests;
parity and i18n gates pass; the extension built with `VITE_POWERUPS=off`
carries no Powerup marker (`scripts/check-powerups-bundle.mjs`). Not done:
§4 allowlist (`/v1/networks.powerups`, the backend has no such field yet)
and the mobile bundle grep in CI (the extension is gated; mobile is
documented, run it by hand on an `expo export`). Manual QA on device and
in the side panel is the owner's, per the hold.

## Batches (each: typecheck + lint + tests green, one commit)

A. shared core: `core/broadcast/solana.ts`, `core/confirmation/*`,
`core/signing/requestSignature.ts`; `prepared-transactions.ts` uses broadcast.
B. shared powerups: registry, the Powerup folders, locales split, i18n
check reads the split files.
C. lint boundary + fixture test.
D. mobile: `TransactionConfirmation`, `ConfirmationHost` in
`(app)/_layout.tsx`, powerups route re-wired, catalog from registry, Metro
alias, `eas.json`.
E. DOM: `TransactionConfirmation` twin, host in the extension `App`,
`PowerupsPage` + entry, WXT alias + env, parity maps.
F. bundle-grep script + CI step, AGENTS gate row, CHANGELOG.
