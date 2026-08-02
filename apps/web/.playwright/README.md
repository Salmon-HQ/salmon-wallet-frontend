# Playwright web test suite

`@playwright/test` suite for the web app (`@salmon/web`). Runs against the
Vite dev server (auto-started by the config) and selects elements by the
shared `data-testid` contract (`Testable` in `packages/shared`, see the
`e2e-test-labels` skill).

> Tracked content: `tests/`, `*.ts` (config/env), `README.md`, `AGENTS.md`,
> `.env.test.example`. Local-only: `test-results/`, `playwright-report/`,
> `.env.test`.

## Layout

| Path | Purpose |
|---|---|
| `playwright.config.ts` | `@playwright/test` config — `testIdAttribute: data-testid`, `webServer` auto-starts the Vite dev server, `baseURL` |
| `env.ts` | Suite-local `.env.test` loader + `isBackendUp()` |
| `tests/` | Specs (`*.spec.ts`) |

## Prerequisites

1. **Chromium.** `@playwright/test` is a devDependency of `@salmon/web`:
   ```sh
   pnpm --filter @salmon/web exec playwright install chromium
   ```
2. **`salmon-api` backend** on `127.0.0.1:3001` (specs skip when it is down).
3. The dev server starts automatically via the config's `webServer`
   (`pnpm --filter @salmon/web dev`, `http://localhost:5173`); an already
   running server is reused.

## Pre-flight

Before running anything beyond the boot-level smoke, check what the test
wallet actually holds — a quick RPC query (`solana balance <addr>`, or a
JSON-RPC `getBalance` / `getTokenAccountsByOwner` call) or just unlocking
the app and looking at Home/Collectibles. That tells you which
environment / `.env.test` to point at and which flows are safe to run.

Per-flow prerequisites:

| Flow | Needs |
|---|---|
| Send | SOL for fee + amount |
| Swap | balance of the input token |
| NFT / burn | an NFT owned by the test wallet |
| Sign / connect / SIWS | nothing — no funds required |

Repo policy: a spec that finds its prerequisite missing skips with a clear
message (`test.skip(..., reason)`), never a cryptic failure. A spec where
the backend is reachable but behaves wrong still fails — it does not skip.

## Running

```sh
pnpm --filter @salmon/web e2e          # run tests/*.spec.ts
pnpm --filter @salmon/web e2e:ui       # Playwright UI mode
```

Reports land in `playwright-report/`; failure traces/screenshots in
`test-results/`.

## Differences from the extension suite

- **Target**: the web app via the dev server, not the extension popup — no
  `--load-extension` flags and no persistent extension profile.
- **Auth/state**: the web app has no persistent extension profile, so a fresh
  context starts at onboarding. The current `smoke.spec.ts` only asserts the
  app boots and honors the lock `data-testid` when present. Full unlock/recover
  web flows need a seeded wallet captured once into a Playwright
  `storageState` and reused — that is the next step for this suite.

## Reference

`apps/extension/.playwright/` is the canonical pattern (fixture shape, env
loader, selector contract). The web suite mirrors it minus the extension
loading.
