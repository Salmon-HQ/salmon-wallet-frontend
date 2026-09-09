# QA Runbook — Salmon Wallet v3

Baseline quality checks every change should clear before it ships, how to run
each one, and what is and isn't covered today. This is a **state-of-reality**
document: it marks what is automated, what is manual, and the known debt — it
does not promise coverage that isn't there.

Scope: the monorepo's two runtimes — `apps/extension` (WXT + the DOM kit) and
`apps/mobile` (React Native / Expo) — plus the shared packages
(`packages/shared`, `packages/ui`). The backend lives in the sibling repo
`../salmon-wallet-backend` and runs in Docker.

---

## TL;DR — per-change gate

CI runs this on every PR (`.github/workflows/ci.yml`); the same command works
locally from the repo root:

```bash
pnpm turbo run typecheck lint test:coverage   # all 5 packages, zero warnings, coverage floor
node scripts/check-i18n.mjs                   # en/es key parity + orphans
node scripts/check-dom-parity.mjs             # extension = mobile on the DOM
```

The e2e suites below need the backend up and are run per-surface (see each
section). They **skip** when `../salmon-wallet-backend` is unreachable, so they
never fail a machine that simply doesn't have the backend running — but a
reachable backend with wrong behaviour **does** fail them.

---

## Pre-release circuit

The complete gate before tagging a release (`extension/v*` tag or store
submission). Ordered so the cheap layers fail first. Steps 1–2 are
machine-run; 3–5 are local because they need things CI does not have (the
Docker backend, funded test wallets, an iOS simulator).

**1. PR checks already green** — every merged PR passed
`typecheck + lint + test:coverage + check:i18n + check:parity` (ci.yml). Nothing to re-run.

**2. E2E workflow** — `.github/workflows/e2e.yml` runs the extension
Playwright suite headless every night and on demand
(`gh workflow run e2e.yml`). Check the latest run is green:
`gh run list --workflow E2E --limit 1`. In CI these suites run **without**
backend or seeded wallets, so backend/seed-gated specs skip — full depth
comes from step 3. A PR can opt into this workflow with the `e2e` label.

**3. Playwright suites at full depth (local)** — with `../salmon-wallet-backend` running
in Docker and real `.env.test` files (copied from `.env.test.example`, filled
with the funded test seeds):

```bash
pnpm --filter @salmon/extension e2e    # headed by default
```

Expected: green, with only the on-chain specs skipped (they are gated by
`SALMON_E2E_ONCHAIN=1` because they spend real SOL — run them only when the
release touches send/burn paths, and expect a small balance drain).

**4. Maestro (mobile, local — needs a booted iOS simulator or Android
emulator with the Expo dev build installed)**:

```bash
cd apps/mobile/.maestro
./run.sh suites/smoke.yaml     # read-only, always
./run.sh suites/actions.yaml   # mutates state / sends real dust txs — release-blocking flows only
```

`run.sh` must be invoked from `.maestro/` (cwd-relative screenshots) and
gates on the backend being reachable. See `.maestro/README.md` for the
one-time setup and `.maestro/AGENTS.md` for known failure modes.

**5. Backend-live integration tests (local)** — the `packages/shared` API
tests marked with the skipIf-backend pattern only exercise the real contract
when `../salmon-wallet-backend` answers on `http://127.0.0.1:3001`:

```bash
pnpm --filter @salmon/shared test      # with the backend up: live blocks run instead of skipping
```

**Go / no-go**: steps 1–2 green + step 3 green + step 4 smoke green (+
actions for release-blocking flows) + step 5 green with backend up. Any red
that cannot be explained as environment (simulator missing, backend down) is
a stop.

---

## Coverage matrix

| Dimension                 | extension         | mobile              | How                 |
| ------------------------- | ----------------- | ------------------- | ------------------- |
| Types                     | ✅                | ✅                  | `turbo typecheck`   |
| Unit / component          | —                 | ✅ jest             | vitest / jest       |
| Functional e2e            | ✅ Playwright     | ✅ Maestro          | per-suite           |
| Accessibility (automated) | ✅ axe            | 🟡 a11y props only  | axe critical gate   |
| Cross-browser             | chromium only     | n/a                 | Playwright projects |
| Responsive                | n/a (fixed popup) | 🟡 single simulator | —                   |
| i18n parity               | ✅                | ✅ (shared locales) | `i18n:check`        |

✅ automated · 🟡 partial / manual · ❌ not covered (see Known gaps).

---

## Environment & prerequisites

- **Backend**: `../salmon-wallet-backend` in Docker, reachable at `http://127.0.0.1:3001`
  (a `404` on `/` means it's alive). Backend-gated e2e specs skip if it's down.
- **Playwright browsers** (extension e2e is chromium-only):
  `pnpm exec playwright install chromium`
- **Test secrets**: each Playwright suite reads a gitignored `<suite>/.env.test`
  (see `<suite>/.env.test.example` for the keys — typically
  `SALMON_TEST_PASSWORD` + `SALMON_TEST_SEED_A`/`SEED_B`). Never commit real
  values; the password must be 12+ chars.
- **Mobile**: a booted iOS Simulator / Android emulator with the Expo dev build
  installed. Run Maestro from `apps/mobile/.maestro/` (its `takeScreenshot`
  paths are cwd-relative — see `apps/mobile/.maestro/AGENTS.md`).

---

## Running each check

### Extension e2e (functional + a11y)

```bash
pnpm --filter @salmon/extension build  # data-testids ship in the bundle — rebuild first
pnpm --filter @salmon/extension e2e
```

Specs in `apps/extension/.playwright/tests/`: `lock`, `receive`, `send`,
`activity`, `settings` (open → read-only panels → close, never touches
secret-reveal or destructive actions), and `a11y` (axe on home, the receive
sheet and the settings drawer). If a run hangs,
`rm -rf apps/extension/.playwright/profiles` forces a clean recover.

### Mobile e2e (Maestro)

```bash
cd apps/mobile/.maestro
maestro test flows/smoke/...           # or flows/actions/...
```

Flows select by `id:` (React Native `testID`) — immune to copy/i18n. Secret /
destructive flows (`flows/actions/reveal/*`, `flows/actions/reset/*`) exist for
id coverage; do not run them casually.

### Lighthouse

Retired with the web app (2026-09-02).

### Solana devnet — live suites and the dApp harness

Two checks need a funded **devnet** key: the opt-in live suites in
`packages/shared` (`simulation.live.test.ts`, `dapp-approval.live.test.ts`)
and the manual dApp harness (`apps/extension/.playwright/scripts/test-dapp.html`,
card 5: a version 1 / >1232-byte transaction through `signAndSendTransaction`).
Both spend a few thousand lamports per run. Devnet only — never point either
at mainnet, never use a key that holds real funds, never commit a key.

**One-time setup (a throwaway test key).** Requires the Solana CLI
(https://docs.anza.xyz/cli/install, Agave ≥ 4.2):

```bash
solana-keygen new -o ~/.config/solana/devnet.json --no-bip39-passphrase
solana address -k ~/.config/solana/devnet.json          # fund this address
solana balance -k ~/.config/solana/devnet.json -u devnet
```

Fund it at https://faucet.solana.com (the CLI's `solana airdrop 1 -u devnet`
is usually rate limited). 0.5 SOL covers hundreds of runs. The key file is a
64-number JSON array; the live suites want only the 32-byte seed — the first
32 numbers:

```bash
export SOLANA_LIVE_SIGNER_SEED="$(node -e 'const k=require(require("os").homedir()+"/.config/solana/devnet.json");console.log(JSON.stringify(k.slice(0,32)))')"
```

Losing or deleting the key costs nothing but the devnet SOL on it — repeat the
three commands above to get a new one.

**Live suites** (skipped unless both variables are set; skip again if the RPC
is unreachable, fail if the node answers and the contract does not hold):

```bash
RUN_SOLANA_LIVE=1 SOLANA_LIVE_SIGNER_SEED="$SOLANA_LIVE_SIGNER_SEED" \
  pnpm --filter @salmon/shared test -- --run src/blockchain/solana/simulation.live.test.ts src/utils/dapp-approval.live.test.ts
```

`SOLANA_LIVE_RPC_URL` overrides the default public devnet RPC.

**dApp harness** (manual, against the dev build):

1. `pnpm --filter @salmon/extension dev`, load `apps/extension/dist/chrome-mv3-dev`
   unpacked; serve the harness from its folder
   (`python3 -m http.server 8080` in `apps/extension/.playwright/scripts/`)
   and open `http://localhost:8080/test-dapp.html`.
2. Switch the extension to **Solana Devnet** and fund its address from the
   test key: `solana transfer <extension-address> 0.1 -k ~/.config/solana/devnet.json -u devnet --allow-unfunded-recipient`.
   The approval popup signs on the wallet's _active_ network and refuses a
   request built for another one, so a wallet left on mainnet shows the
   network-mismatch notice instead of sending.
3. Run the cards top to bottom. Card 5 must show the **Priority fee** row in
   the popup and end with a confirmed signature; its secondary button sends an
   unsupported version and must be refused without a signature.

## Accessibility

Two automated layers plus manual checks:

- **axe-core critical gate** (e2e): `a11y.spec.ts` (extension) fails only
  on `critical` violations and attaches the full violation list for triage.
  Automated axe catches ~30–40 % of WCAG — it complements, never replaces,
  manual keyboard + screen-reader passes.
- **Authoring**: every interactive element carries a stable `testID` /
  `data-testid` plus semantics (`accessibilityRole`/`aria-label`,
  `accessibilityState`). See the `e2e-test-labels` skill
  (`.agent/skills/e2e-test-labels/SKILL.md`) for the selector + a11y contract.

Manual, per release: keyboard navigation of the main flows, reduced-motion
behaviour, and a screen-reader spot check of auth + send.

---

## Selector / test-label contract

One canonical kebab-case id per logical element, identical across platforms
(RN `testID`, DOM `data-testid`, Maestro `id:`). Lists are parametrized
(`token-row-${symbol}`, `settings-item-${slug}`). Canonical ids are immutable
once flows depend on them — renaming is a breaking change to the suites. Full
rules: `.agent/skills/e2e-test-labels/SKILL.md`.

The kit's inputs and switches are plain elements (`<input>`, `role="switch"`);
pass `testID` and it lands as `data-testid` on the element itself.

---

## i18n

`pnpm --filter @salmon/shared i18n:check` flattens `en`/`es` for the shared
translations and the extension `_locales` and fails on any key the reference
locale has but a translation is missing. Currently in sync. Add it to CI before
any release that touches copy.

---

## Known gaps & debt

- **Cross-browser**: extension e2e is chromium-only (extensions load via a
  persistent chromium context). Firefox needs its browser binary
  (`playwright install firefox`).
- **No visual-regression baselines** and **mobile runs on a single simulator
  size** — UI-shape regressions across devices are caught manually today.
- **`@salmon/shared i18n:check`** (locale key linting beyond the root
  `check-i18n.mjs` parity gate) is a local command, not yet wired into CI.

---

## Deploy & rollback (summary)

- **Web**: retired 2026-09-02; `apps/web` and its deploy workflow are deleted.
- **Extension**: `build-extension.yml` (`extension/v*` tag push or manual
  `workflow_dispatch`) produces chrome/firefox artifacts, a source bundle, and
  (on a tag) a GitHub Release with the zips + `SHA256SUMS`; no store
  auto-publish.
- **Mobile**: EAS build (`pnpm build:aab` / `build:apk` from `apps/mobile`) —
  see `apps/mobile/AGENTS.md` for the pre-build checklist and keystore rules.

Post-deploy, watch error tracking + uptime; keep the previous build deployable
for a fast revert.
