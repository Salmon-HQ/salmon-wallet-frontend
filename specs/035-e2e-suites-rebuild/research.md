# Research: End-to-end suites rebuilt on the definitive layout

Phase 0 of [plan.md](./plan.md). Findings from a static audit of both suites
against the source on 2026-09-24, and from the 2026-09-23 device walk.

## R1. Mobile (Maestro) — stale selectors

60 YAML files: 27 smoke, 12 actions, 3 store, 16 subflows, 2 suites.

| Selector                                        | Where                                                                                                        | Current truth                                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `receive-address` (id)                          | `smoke/receive/sheet.yaml`                                                                                   | The receive sheet shows the address only inside the QR and the copy button; assert `receive-qr` + `receive-copy-button`.                      |
| `powerups-browse-screen` (id)                   | `smoke/home/shell.yaml`                                                                                      | The Powerups screen became a catalogue sheet over Home (`e03e42bc`); assert a catalogue row toggle `powerups-row-toggle-<id>`.                |
| `'My Collectibles'` (text)                      | `smoke/home/shell.yaml`, `smoke/nft/detail.yaml`, `subflows/send-nft.yaml`, `store/capture-shots.yaml`       | No such heading; the NFTs tab is identified by its content (`collectibles-*` states or `nft-card-<mint>`).                                    |
| `'DERIVATION PATH'` (text)                      | `actions/reveal/private-key.yaml`                                                                            | The copy is "Derivation Path"; anchor on the panel's testID instead of copy.                                                                  |
| `'Refreshing...'` (text)                        | `store/capture-shots.yaml`                                                                                   | Not in copy; drop the step.                                                                                                                   |
| `point:` taps                                   | `actions/account/name-save.yaml`, `actions/profile/picture-save.yaml` (2), `actions/reveal/private-key.yaml` | Replace with testIDs; add a testID to the component where none exists.                                                                        |
| Mainnet NFT `Mindfolk Founder #5154` / its mint | `smoke/nft/detail.yaml`, `store/capture-shots.yaml`                                                          | Depends on an NFT the test wallet may not hold; rebase on the devnet NFTs minted for the test wallet, or keep only in the store capture tool. |

Checked and valid (resolved through templates or props):
`recover-word-input-N` (`${testID}-word-input-${n}`), `settings-item-*`
(`settingsItemTestId`), `portfolio-tab-*` (`${tabTestIDPrefix}-${key}`).

External UI, correct as is: Expo dev menu labels (`Fast refresh`,
`Toggle Dev Menu`, `Tools button`, `Development Build`), the iOS `Allow Paste`
prompt, and test data typed by the flow (`Wallet B`, `order-12`,
`Salmon Treasury`).

## R2. Mobile — intermediate screens

- **Dev launcher (SDK 57)**: lists no local server; open the bundle with
  `salmonwallet://expo-development-client/?url=…localhost:8081` (already in
  `dev-launcher-pass.yaml`, `53c9886a`). A release build has no launcher: every
  step stays guarded.
- **Recovery → Home**: biometric prompt (optional) → `Congratulations!` →
  `success-go-to-wallet-button` → analytics consent → Home. The recovery
  subflow ends at the password submit; only `onboard-walletA/B` continue.
  The release build of 2026-09-23 skipped the consent screen, so the consent
  step must be optional, keyed on its own testID.
- **Lock**: a force-stop or background locks; flows that relaunch must unlock
  through `lock-password-input`.

## R3. Extension (Playwright)

13 specs + `helpers.ts` / `fixtures.ts`: 152 `getByTestId` selectors, 4 stale:
`tab-collectibles`, `tab-home` (the bottom tab bar is gone), and
`settings-close-button`, `balance-carousel-next` (the carousel is gone) — all in
the two analytics-coverage specs. Five fixed sleeps: `helpers.ts:32` (3 s),
`analytics-coverage.spec.ts` (500 ms, 1 ms, 2 ms), `analytics.spec.ts` (500 ms).

Legacy drivers (`scripts/*.mjs`, 19 + `lib.mjs`), classified:

- **Capture tools** (keep, documented as tools, not tests): `store-shots`,
  `flesh-shots`, `warmth-shots`, `tabular-proof`, `interactive-launch`.
- **Behaviour checks to port into specs**: `collectibles-chrome`,
  `collectibles-multichain`, `nft-spam-filter`, `nft-transfer`, `burn-cnft`,
  `lock-and-pages`, `settings-panels`, `dapp-providers`, `state-modifying`.
- **Superseded / obsolete** (delete): `bootstrap`, `walkthrough`,
  `state-check`, `discover-wallet-addr` (addresses come from `.env.test`).

## R4. Preflight

- Mobile `run.sh` already checks secrets, backend, Metro and `adb reverse`.
  Missing: device booted, Metro bundle prewarmed at
  `apps/mobile/index.bundle?platform=…` (the monorepo path; `/index.bundle`
  returns 404), installed build matches the checkout's Expo SDK (read
  `assets/app.config` `sdkVersion` from the installed APK), and a lock so a
  second run refuses instead of failing on Maestro's fixed port 7001.
- Extension: `global-setup.ts` checks the password; missing: dist present and
  newer than the source, Chromium installed for the pinned Playwright, backend.

## R5. Drift guard

A Node script (`scripts/check-e2e-selectors.mjs`) run by CI next to
`check:parity`: extracts every Maestro `id:` / text anchor and every Playwright
`getByTestId`, resolves them against the source (literal testIDs, template
testIDs with ≥ 4 static characters, locale copy), and fails with
`file:line selector`. An allowlist names the external strings (dev menu,
system prompts, typed test data) so they are explicit, not skipped.

## R6. Jev

Considered for auditing flows; rejected. The question "does this selector
exist in the source" has an exact answer a deterministic check gives; a
probabilistic judgement adds cost and uncertainty to a yes/no fact.
