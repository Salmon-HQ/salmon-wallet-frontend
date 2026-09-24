# Playwright extension test suite

Drives the built extension in Chromium with `@playwright/test`. The specs in
`tests/` are the coverage; the `.mjs` programs in `scripts/` are capture tools.
Conventions and traps are in `AGENTS.md`.

Tracked: `tests/`, `scripts/`, the `*.ts` files, `README.md`, `AGENTS.md` and
`.env.test.example`. Everything else (`profiles/`, `test-results/`,
`playwright-report/`, `screenshots/`, `reports/`, `.env.test`) is local-only.

## Layout

| Path                   | Purpose                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `playwright.config.ts` | `testIdAttribute: data-testid`, one worker, actions bounded at 30 s                              |
| `global-setup.ts`      | The preflight (below)                                                                            |
| `fixtures.ts`          | Loads `dist/chrome-mv3` into a persistent profile → `{ context, extensionId, popup }`            |
| `helpers.ts`           | `unlockOrRecover`, `waitHome`, `closeSettings`, `selectDevnet`, `assertDevnet`, `fixtureNftCard` |
| `env.ts`               | Loads `.env.test`; `isBackendUp()`                                                               |
| `tests/`               | The specs                                                                                        |
| `scripts/`             | Capture tools and their shared `lib.mjs`                                                         |

## Prerequisites

1. **Chromium** for the pinned Playwright:
   `pnpm --filter @salmon/extension exec playwright install chromium`.
2. **The extension build** at `apps/extension/dist/chrome-mv3`. For the local
   backend, build in development mode and point the runner at it:

   ```sh
   cd apps/extension
   pnpm build --mode development
   ln -sfn chrome-mv3-dev dist/chrome-mv3
   ```

3. **`salmon-api`** on `127.0.0.1:3001` (sibling repo `../salmon-wallet-backend`).
4. **`.env.test`** from `.env.test.example`: the password, seeds A and B, and
   both wallets' addresses.
5. **A `salmon-wallet-backend` checkout** beside this repo (or
   `SALMON_BACKEND_DIR`): the devnet fixture script loads Metaplex from it.

## Running

```sh
SALMON_E2E_HEADLESS=1 pnpm --filter @salmon/extension e2e                   # every spec
SALMON_E2E_HEADLESS=1 pnpm --filter @salmon/extension e2e tests/lock.spec.ts
SALMON_E2E_HEADLESS=1 SALMON_E2E_ONCHAIN=1 pnpm --filter @salmon/extension e2e   # plus on-chain specs
pnpm --filter @salmon/extension e2e:ui                                       # Playwright UI mode
```

Headless keeps the browser off your screen — a headed window that your mouse
crosses counts as wallet activity. Reports land in `playwright-report/`,
failure traces and screenshots in `test-results/`.

## Preflight

Before any spec, `global-setup.ts` stops the run and names the fix when a
secret is missing, the build is missing or older than its sources, Chromium is
not installed, or the devnet fixtures cannot be put in place.
`scripts/devnet-fixtures.cjs` (repo root) keeps Wallet A funded with devnet SOL
(topped up from Wallet B) and holding the "Salmon Test NFT" fixture, and stops
the run with the faucet link when Wallet B runs low.

A spec skips with a message when the backend is down or its opt-in flag is
unset; it fails when a prerequisite is present but misbehaves.

## Specs

| Spec                              | Covers                                                               | Moves anything |
| --------------------------------- | -------------------------------------------------------------------- | -------------- |
| `lock`                            | Unlock; Lock now; leaving the page locks                             | —              |
| `auto-lock`                       | Idle lock at 5 min, not postponed by another wallet window (≈ 6 min) | —              |
| `onboarding-grid`                 | Onboarding screens keep their control bands and fit the popup        | —              |
| `analytics-consent-prompt`        | First-run consent screen, opt in                                     | —              |
| `analytics`                       | Opt-in gates events; payloads stay anonymous                         | —              |
| `analytics-coverage`              | Every non-on-chain event fires (views the devnet fixture NFT)        | —              |
| `a11y`                            | No critical axe violations on Home, Receive, Settings                | —              |
| `activity`, `receive`, `settings` | Those screens by their testIDs                                       | —              |
| `send`                            | Send up to the amount step on devnet, then cancel                    | —              |
| `nft-spam-filter`                 | Spam NFTs are requested only with "Show unverified tokens" on        | —              |
| `legacy-migration`                | A v2 install with no password is migrated encrypted                  | —              |
| `analytics-coverage-onchain`      | Devnet SOL send and NFT transfer A → B fire their events             | devnet, opt-in |
| `nft-burn`                        | Burns the devnet fixture NFT                                         | devnet, opt-in |

## Capture tools

Not tests: they take screenshots for the stores and for visual review. Run
from the repo root with `node apps/extension/.playwright/scripts/<name>.mjs`.

| Tool                                                       | Output                                                                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `store-shots.mjs`                                          | Chrome Web Store screenshots                                                                                                             |
| `flesh-shots.mjs`, `warmth-shots.mjs`, `tabular-proof.mjs` | Visual proofs for design review                                                                                                          |
| `interactive-launch.mjs`                                   | Opens Chromium with the extension and stays up for manual exploration                                                                    |
| `dapp-providers.mjs`                                       | Inspects the injected providers on a public dApp (raydium.io) and signs a message; to be replaced by dApp specs against `test-dapp.html` |

When a profile gets into a bad state, `rm -rf apps/extension/.playwright/profiles`.
