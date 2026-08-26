# Playwright extension test suite

Lives at `apps/extension/.playwright/`. Drives the extension build through
Chromium with Playwright.

> **Migration in progress — two runners coexist.**
>
> - **`@playwright/test` (target).** New specs live in `tests/*.spec.ts` and
>   run with the official runner via `pnpm --filter @salmon/extension e2e`.
>   They select elements by the shared `data-testid` contract (`Testable` in
>   `packages/shared`, see the `e2e-test-labels` skill) and assert with
>   web-first `expect`. The lock/unlock flow is migrated (`tests/lock.spec.ts`).
> - **Legacy `.mjs` drivers (`scripts/`).** Self-contained Node ESM programs
>   that predate the runner; each writes screenshots + a findings report
>   instead of assertions. They are being ported to `tests/` flow-by-flow as
>   their screens get labeled. Documented below under "Legacy scripts".

> Tracked content: `tests/`, `scripts/`, `*.ts` (config/fixtures/helpers/env),
> `README.md`, `AGENTS.md`, and `.env.test.example`. Everything else
> (`profiles/`, `screenshots/`, `snapshots/`, `reports/`, `fixtures/`,
> `test-results/`, `playwright-report/`, `.env.test`) is local-only.

## Layout

| Path                   | Purpose                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `playwright.config.ts` | `@playwright/test` config — `testIdAttribute: data-testid`, serial, single worker                                              |
| `tests/`               | Migrated specs (`*.spec.ts`) run by `@playwright/test`                                                                         |
| `fixtures.ts`          | Extension fixture — loads the MV3 build into a persistent profile, exposes `{ context, extensionId, popup }`                   |
| `helpers.ts`           | Flow helpers for specs (`unlockOrRecover`, `waitHome`), ported from `lib.mjs`                                                  |
| `env.ts`               | Suite-local `.env.test` loader + `isBackendUp()` (used by config/global-setup/specs)                                           |
| `global-setup.ts`      | Loads secrets and fails fast if the password is missing                                                                        |
| `scripts/`             | Legacy runnable `.mjs` scripts + shared `lib.mjs` (being phased out)                                                           |
| `scripts/lib.mjs`      | Legacy shared helpers: `launch`, `openPopup`, `unlockOrRecover`, `waitHome`, `capture`, `waitForButtonEnabled`, secrets loader |
| `fixtures/`            | Generated artifacts that scripts depend on (e.g. `wallet-b-addr.txt`)                                                          |
| `profiles/extension/`  | Persistent Chromium profile — wallet recovery, dev-mode toggle, etc. survive across runs                                       |
| `reports/`             | Markdown reports written by each script                                                                                        |
| `.env.test`            | Secrets (test seeds + password). Loaded by `lib.mjs`. Never inline elsewhere                                                   |

`screenshots/` and `snapshots/` are recreated by `lib.mjs` on first capture
inside a script run. They are deliberately not checked in.

Some external browser-automation tools auto-generate a `.playwright-cli/`
directory in repos they run in. That tooling is **separate** from this
suite — `.playwright-cli/` can be deleted at any time without affecting
these scripts.

## Prerequisites

1. **Chromium.** `@playwright/test` is a devDependency of `@salmon/extension`.
   Install the browser once:

   ```sh
   pnpm --filter @salmon/extension exec playwright install chromium
   ```

   Extensions require a headed (non-headless-shell) Chromium — the fixture
   launches with `headless: false`.
   (Legacy `.mjs` scripts instead resolve Chromium at runtime via a local
   `playwright` install, a global `@playwright/cli`, or `PLAYWRIGHT_PATH`.)

2. **Extension build**. The scripts load `apps/extension/dist/chrome-mv3`.
   For local-backend testing build with development mode so the bundle
   targets `localhost:3001/local`:

   ```sh
   cd apps/extension
   pnpm build --mode development
   # build emits dist/chrome-mv3-dev — symlink for the test runner:
   ln -sfn chrome-mv3-dev dist/chrome-mv3
   ```

   Build with default mode (`pnpm build`) produces a prod-pointing bundle —
   useful for smoke tests against the staging API but tokens/NFTs come from
   real production data.

3. **`salmon-api` backend** running on `127.0.0.1:3001` (see sibling repo
   `../salmon-wallet-backend`, `npm run serverless:start:local`). Verify with
   `curl http://127.0.0.1:3001/local/health`.

4. **`apps/extension/.playwright/.env.test`** populated (copy from `.env.test.example`):
   ```
   SALMON_TEST_PASSWORD=<password>
   SALMON_TEST_SEED_A=<12-word mnemonic>
   SALMON_TEST_SEED_B=<12-word mnemonic>
   ```
   `lib.mjs` throws on startup if any are missing.

## Pre-flight

Before running anything beyond `lock.spec.ts` or read-only Phase 1
scripts, check what Wallet A / Wallet B actually hold — `state-check.mjs`,
a quick RPC query (`solana balance <addr>`, `getTokenAccountsByOwner`), or
opening the popup and looking at Home/Collectibles. This is real mainnet
money — know the balance before a script spends it.

Per-flow prerequisites:

| Flow                                                     | Needs                                        |
| -------------------------------------------------------- | -------------------------------------------- |
| `lock.spec.ts`, `dapp-providers.mjs`, connect/sign flows | nothing — no funds required                  |
| `state-modifying.mjs` (Send, Address Book)               | Wallet A: SOL for fee + the 0.001 SOL amount |
| `nft-transfer.mjs`                                       | Wallet A: an NFT to send                     |
| `burn-cnft.mjs`                                          | Wallet B: the target scam cNFT               |

Repo policy: a spec/script that finds its prerequisite missing skips (or
stops, for legacy `.mjs` scripts) with a clear message, never a cryptic
failure. One where the backend is reachable but behaves wrong still
fails — it does not skip. Same rule as the `isBackendUp()` gate below.

## Running specs (`@playwright/test`)

From the repo root:

```sh
pnpm --filter @salmon/extension e2e          # run tests/*.spec.ts headed
pnpm --filter @salmon/extension e2e:ui       # Playwright UI mode
pnpm --filter @salmon/extension e2e tests/lock.spec.ts   # a single spec
```

Specs skip automatically when `salmon-api` is unreachable (repo policy: skip
when the backend is down, fail when it is up but behaves wrong). Reports land
in `playwright-report/`; failure traces/screenshots in `test-results/`.

The persistent profile lives at `profiles/default/`. When a run gets into a
bad state, `rm -rf apps/extension/.playwright/profiles` and re-run — the lock
spec re-onboards via the recover flow.

## Legacy scripts

The `.mjs` drivers below are not yet ported to `@playwright/test`. They are
standalone Node ESM — run from the repo root:

```sh
node apps/extension/.playwright/scripts/<name>.mjs
```

Background long-running scripts and tail the report when done:

```sh
node apps/extension/.playwright/scripts/walkthrough.mjs &
tail -f apps/extension/.playwright/reports/PHASE1-WALKTHROUGH.md
```

### Script index

### Setup / debug

| Script                   | Purpose                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `bootstrap.mjs`          | Quick infra sanity check — launches the extension, opens the popup, captures the initial state. Run first when something feels off. |
| `interactive-launch.mjs` | Opens Chromium with the extension loaded and **stays alive** until Ctrl-C. Useful for manual exploration or attaching DevTools.     |
| `state-check.mjs`        | Verifies the persisted profile is intact (wallet recovered, NFTs present). Run after destructive tests.                             |

### Phase 1 — read-only (no on-chain side effects)

| Script                | What it covers                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `walkthrough.mjs`     | Full sweep — onboarding, recover, home, tabs (Home/Collectibles/Swap), Send/Receive/Activity, every Settings panel via the legacy in-place driver. |
| `settings-panels.mjs` | The 10 Settings sub-panels, each captured from a **fresh popup** (works around an SPA route issue in the legacy walkthrough).                      |
| `lock-and-pages.mjs`  | Lock cycle, re-lock-on-reload regression, About + Help & Support, NFT detail navigation.                                                           |
| `dapp-providers.mjs`  | Inspects the injected `window.solana` / `window.salmon` provider against jup.ag, plus a deep dump of the Security panel.                           |

### Wallet plumbing

| Script                     | Purpose                                                                                                                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discover-wallet-addr.mjs` | Wipes profile, recovers with `SEED_B`, captures the Solana receive address, writes it to `fixtures/wallet-b-addr.txt`, then wipes profile so subsequent runs default back to `SEED_A`. **Run this once** before any cross-wallet test. |
| `nft-spam-filter.mjs`      | Validates that toggling Developer Networks reveals scam cNFTs that the spam filter (`packages/shared/src/utils/nft-spam-filter.ts`) hides by default. Uses Wallet B which has known scam airdrops.                                     |

### Phase 2 — state-modifying / on-chain

| Script                | Action                                                                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state-modifying.mjs` | Address Book Save (Wallet B), Send 0.001 SOL Wallet A → Wallet B (real on-chain mainnet). Waits for async address validation before clicking Save/Send.                                                                          |
| `nft-transfer.mjs`    | Send a Solana NFT from Wallet A to Wallet B. The dialog shows a Confirm modal directly (no Review step) and may trigger a password prompt that the driver does not currently handle — outcome inconclusive when fully automated. |
| `burn-cnft.mjs`       | Burn the `JUP.PRO Drop Pass` scam cNFT from Wallet B (mainnet). Verified on-chain success. Selector targets `aria-label="Burn NFT"` — see lessons learned in `AGENTS.md`.                                                        |

## Reports

Each script writes one markdown file to `reports/`. Naming mirrors the
script:

- `walkthrough.mjs` → `reports/PHASE1-WALKTHROUGH.md`
- `settings-panels.mjs` → `reports/PHASE1-SETTINGS-PANELS.md`
- `lock-and-pages.mjs` → `reports/PHASE1-LOCK-AND-PAGES.md`
- `dapp-providers.mjs` → `reports/PHASE1-DAPP-PROVIDERS.md`
- `state-modifying.mjs` → `reports/PHASE2-STATE-MODIFYING.md`
- `nft-transfer.mjs` → `reports/PHASE2-NFT-TRANSFER.md`
- `burn-cnft.mjs` → `reports/BURN-CNFT.md`

`REPORT.md` at the suite root captures the most recent consolidated session
findings (bugs, false positives, validations).

## Common failure modes

- **Send button "absent" but visible in screenshot**: Salmon's home re-renders
  after waitHome occasionally. Use `waitForButtonEnabled` from `lib.mjs`
  rather than `count()` followed by `click()`.
- **Save Address disabled**: Salmon validates the address asynchronously
  (RPC call) before enabling Save. Use `waitForButtonEnabled` with at least
  10s timeout, or watch for the loading spinner inside the field to clear.
- **Profile clutter between iterations**: when a test branch becomes
  unreproducible, `rm -rf apps/extension/.playwright/profiles` and start fresh.
  Wallet recovery in `lib.mjs/unlockOrRecover` handles the onboarding case.
- **`PHASE2-V*` reports**: anything with a `V<n>` suffix is from a deleted
  iteration. The canonical reports drop that suffix.
