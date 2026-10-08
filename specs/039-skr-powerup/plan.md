# Implementation Plan: SKR Powerup

**Spec**: [spec.md](spec.md) | Backend: spec 021 (`GET /skr/stake`, Powerup `skr` listed on local and staging)

## Design

- `packages/shared/src/powerups/skr/`: `manifest.ts` (id `skr`, core, `solana-mainnet`, icon `Stack`, permissions `address`, no endpoints, no programs, tab `skr`), `locales/{en,es}.json`, `skrView.ts` (facts and history rows), `skrBlocks.ts` (the tab as `KitBlock`s), `useSkrScreenLogic.ts`.
- Twins: `SkrScreen` (mobile, via `SkrTab`) and `SkrPage` (DOM), each a `BlockList` of `skrBlocks`.
- Registered in `registry.ts`, `locales.ts`, `powerups/index.ts`, mobile `getPowerupTab`, `@salmon/ui/powerups` (+ `.off`), extension `powerupBodies.tsx`, `check-i18n`, `check-powerups-bundle`, `check-dom-parity`.
- Liquid SKR comes from the backend (`liquid`), not the wallet's balance.
- The price chart is not drawn: no chart block exists for Powerups (runbook §4). Open as a block decision.
