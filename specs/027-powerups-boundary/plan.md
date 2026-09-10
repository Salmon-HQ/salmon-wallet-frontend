# Implementation plan — 027 Powerups boundary + Swap v2 (0x)

**Branch** `feat/swap-0x` · **Hold**: branch + draft PR only, no merge until the owner lifts it (2026-09-10).
Scope agreed with the owner: §1–3 of the spec, the Swap v2 rewrite against the 0x
`build` contract, the mobile route re-wired, and a DOM twin for the extension.
§4 (allowlist) and §5 land only as the two `403` states the swap renders.

## Decisions (the lazy reading of the spec)

- **§1 `core/`** adds only what does not exist: `core/broadcast` (the Solana
  sign-and-send path extracted from `prepared-transactions.ts`),
  `core/signing` (`requestSignature`, the one entry point) and
  `core/confirmation` (the proposal contract + the provider the platforms
  mount). `crypto/`, `storage/` and the account classes stay where they are —
  the lint rule names those paths; moving them buys no property.
- **§1 `powerups/`**: `registry.ts` (id, copy keys, tier, networks, the route
  key each platform maps), `swap/` (types, API service, hooks, locales). The
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
  screen (the old SwapReviewScreen, generalised to `TransactionConfirmation`,
  one twin per platform), then signs + broadcasts + confirms through
  `core/broadcast` and resolves the signature. Cancel rejects. The Powerup
  never sees signed bytes and never calls the RPC to send.
- **§3**: `EXPO_PUBLIC_POWERUPS` (mobile, Metro `resolveRequest`) and
  `VITE_POWERUPS` (extension, Vite alias) swap `powerups/index.ts` for
  `powerups/index.off.ts` in shared, mobile and ui. Off = empty registry,
  `POWERUPS_ENABLED=false`, no swap locales (they live under
  `powerups/swap/locales` and are merged by the powerups module).
  `POWERUPS_SURFACE_ENABLED` is removed. `scripts/check-powerups-bundle.mjs`
  greps a built bundle for the markers.
- **Swap v2**: `GET /v1/solana-mainnet/ft/swap/build` (mainnet only). Client
  re-patches the blockhash, signs, `sendTransaction` with preflight, confirms.
  Rebuild on `expiresAt`. Fee line from `salmonFee` (amount + bps), route fee
  omitted when null, attribution from the response.

## Batches (each: typecheck + lint + tests green, one commit)

A. shared core: `core/broadcast/solana.ts`, `core/confirmation/*`,
   `core/signing/requestSignature.ts`; `prepared-transactions.ts` uses broadcast.
B. shared powerups: registry, `swap/` (types, `buildSwap` service,
   `useSwapBuild`, `useSwapScreenLogic` v2), locales split, delete
   order/execute paths + tests, i18n check reads the split files.
C. lint boundary + fixture test.
D. mobile: `TransactionConfirmation` (from SwapReview*), `ConfirmationHost`
   in `(app)/_layout.tsx`, SwapScreen v2, `app/(app)/swap.tsx`, powerups
   route re-wired, catalog from registry, Metro alias, `eas.json`.
E. DOM: `TransactionConfirmation` twin, host in the extension `App`,
   `SwapPage`, `PowerupsPage` + entry, WXT alias + env, parity maps.
F. bundle-grep script + CI step, spec §6 → 0x, AGENTS gate row, CHANGELOG.
