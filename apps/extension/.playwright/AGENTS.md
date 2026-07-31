# AGENTS.md instructions for `.playwright`

> Companion to `README.md`. README explains *what* exists and *how to run
> it*. This file documents conventions, traps, and decision rules an
> autonomous agent needs when extending the suite.

## Mental model

The suite is mid-migration and runs **two ways**:

**Target — `@playwright/test`.** Specs live in `tests/*.spec.ts`, run via
`pnpm --filter @salmon/extension e2e`. They use the extension fixture in
`fixtures.ts` (persistent profile + extension loaded → `{ context,
extensionId, popup }`), flow helpers in `helpers.ts`, and assert with
web-first `expect`. **New work goes here.** When you migrate a legacy
script, add the spec under `tests/` and delete the `.mjs` once parity is
confirmed.

**Legacy — `.mjs` drivers.** Each `.mjs` under `scripts/` is a
self-contained Node ESM program that loads secrets via `lib.mjs`, launches
a persistent Chromium with the extension preloaded, drives one workflow,
and writes captures + a markdown report (no assertions). These are being
phased out flow-by-flow; touch them only to keep an un-migrated flow
working or to port it.

## Selector contract (both runners)

Select by the shared **`data-testid` contract** first — `Testable` in
`packages/shared/src/types/ui`, surfaced as `testID` on components (see the
`e2e-test-labels` skill). It is the only i18n-proof anchor; role/text names
break when the app is localized.

Priority: `getByTestId` → `getByRole` (role + accessible name) → text. Never
make CSS, `input[type=...]`, or positional `.nth()`/index the *primary*
selector when a stable id can be added to the component instead. If a screen
you need is unlabeled, prefer adding the id (per the skill) over writing a
fragile selector.

## Conventions to preserve

- **One script per workflow.** Do not create `scriptA-v2.mjs` next to
  `scriptA.mjs`. If a script needs to evolve, edit it in place. Any
  `*-v<n>` suffix or duplicate name is a bug to clean up.
- **All paths via `lib.mjs` exports.** Use `repoRoot`, `profileDir`,
  `screensRoot`, `snapsRoot`, `reportsRoot`, `fixturesRoot`. Never write
  absolute paths inside scripts.
- **Secrets only in `.env.test`.** Never inline a seed, password, or test
  address. `lib.mjs` will throw at startup if any expected key is
  missing — extend the `loadSecrets` check when you add a new secret.
- **Fixtures via `fixtures/`.** Anything one script generates and another
  consumes (e.g. a derived wallet address) goes there as a plain file.
- **Reports via `writeReport(name, body)`.** That helper handles the
  `mkdir` and ensures all reports land in `reports/`.

## Selector lessons learned

The extension uses MUI components throughout. Common gotchas:

| Gotcha | Fix |
|---|---|
| `getByRole('button', { name: /^Burn$/i })` returns 0 | The Burn button has `aria-label="Burn NFT"`. Anchored regexes never match accessible names with extra words. Drop the anchors or query by `aria-label` directly. |
| `popup.locator('input').first()` matches an MUI `<Switch>` checkbox | Use `getByRole('textbox')` for text inputs; switches are excluded automatically. |
| Save/Send buttons render but stay disabled | Salmon validates asynchronously (RPC). Use `waitForButtonEnabled(page, name, timeoutMs)` from `lib.mjs` instead of clicking eagerly. |
| Settings sub-panel screenshot shows the wrong panel | Drawer animation is in flight when you capture. Either sleep ≥ 1500 ms after click or use `settings-panels.mjs` which opens a fresh popup per panel. |
| `popup.goto(popupUrl)` does not reset the SPA route | The popup retains state via `localStorage`. To start clean, open a new page or `rm -rf` the profile. |

## Pre-flight

Confirm the test wallet's state before running a flow that depends on
it — `state-check.mjs`, a quick RPC query, or the popup itself. Do not
assume Wallet A still has SOL or Wallet B still holds the target NFT; both
drain across runs (Send moves real SOL, burn/transfer moves real NFTs).

| Flow | Needs |
|---|---|
| Lock/unlock, connect, sign, dApp provider inspection | nothing |
| Send / Address Book save | Wallet A: SOL for fee + amount |
| NFT transfer | Wallet A: an NFT to send |
| Burn cNFT | Wallet B: the target scam cNFT |

Missing prerequisite → skip with a clear message (same policy as the
backend-down case in the README). Backend up but behaving wrong → fail,
never skip.

## Sensitive workflows — guardrails

Before any irreversible action (send, swap, burn, remove wallet) the
script must confirm context:

- **Send / NFT transfer:** verify the destination address came from
  `fixtures/wallet-b-addr.txt`, never inline. Cap on-chain amounts at
  values acceptable to lose if a test misfires (e.g. `0.001 SOL`).
- **Burn:** assert the burn confirmation page is visible (`/irreversible/i`
  in body text) before clicking Confirm. See `burn-cnft.mjs`.
- **Remove All Wallets:** runs only at the end of a flow because it
  invalidates the persistent profile.

## Adding a new spec (`@playwright/test`) — preferred

1. Add `tests/<flow>.spec.ts`. Import `{ test, expect }` from `../fixtures`
   (gives `popup`, `context`, `extensionId`).
2. Reuse flow helpers from `helpers.ts` (`unlockOrRecover`, `waitHome`);
   extend that file rather than duplicating logic.
3. Select by `getByTestId` per the contract above. If the screen lacks ids,
   add them to the component first (`e2e-test-labels` skill) — do not bake a
   fragile selector into the spec.
4. Gate on the backend: `test.skip(!backendUp, ...)` using `isBackendUp()`
   from `../env` (see `tests/lock.spec.ts`).
5. Keep the suite serial (the config enforces `workers: 1`) — the persistent
   profile and on-chain flows are not parallel-safe.
6. The same guardrails below (Sensitive workflows) apply to specs verbatim.

## Adding a new legacy workflow (`.mjs`)

1. Decide whether it belongs in an existing script or a new one. Splitting
   makes sense when the new workflow has independent setup or different
   destruction risk than what's already there.
2. Write the script. Use `freshPopup`-style helpers if you can copy a
   pattern from `state-modifying.mjs`.
3. Capture meaningfully — one screenshot per state transition with a name
   like `01-form`, `02-review`, `03-result`. Use the workflow name as the
   folder.
4. Write a report with a clear `Findings` section. The pattern is in
   every existing script.
5. Update `README.md` (`Script index` section) and this file if you added
   a new convention.

## Cleaning up

- Outputs are local-only. Delete `screenshots/`, `snapshots/`, and
  `reports/` whenever you want a clean slate.
- Profile lives in `profiles/extension/`. Delete to force re-recovery on
  next run.
- A sibling `.playwright-cli/` directory (left behind by external
  browser-automation tooling, if you use any) is unrelated to this suite
  and can always be deleted.

## Coding style

- ES modules only.
- Prefer `getByRole` selectors. Fall back to attribute selectors only
  when accessible queries fail (and document why with a comment).
- All sleeps are explicit — never trust an arbitrary `await sleep(N)` to
  mean "wait for the UI". Pair with `waitFor` or `waitForButtonEnabled`.
- One-line file header comment that explains the workflow. No multiline
  banners or ASCII art.
