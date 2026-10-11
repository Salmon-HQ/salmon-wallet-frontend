# Tasks: SKR Powerup redesign

## Phase 1 — Design (Pencil)

- [x] T001 Build `SKR-powerup-design-components.pen`: token variables, components StatTile, StatGrid, Pill, ProgressBar, SectionHeader, RewardRow, StakeCard, and the screen from instances; export PNGs at 320 / 393 / 430 widths.

## Phase 2 — Backend contract

- [x] T002 salmon-wallet-backend: `totalStaked` on `GET /skr/stake` (spec 021 FR-006), tests first.
- [x] T003 Frontend type `SkrStakeResponse.totalStaked?: string`.

## Phase 3 — Kit blocks (tests first, twins)

- [x] T004 Contracts: `stat-tile`, `stat-grid`, `pill`, `progress-bar`, `section-label` trailing, `PowerupIconName` additions.
- [x] T005 `Pill` mobile + DOM, with tests.
- [x] T006 `StatTile` + `StatGrid` mobile + DOM, with tests.
- [x] T007 `ProgressBar` mobile + DOM, with tests.
- [x] T008 `SectionLabel` trailing on both twins.
- [x] T009 `BlockList` kinds `card`, `stats`, `row`, `progress`, `divider` on both twins.
- [x] T010 Register in `check-dom-parity`, `docs/POWERUPS-UI.md` §1.10.

## Phase 4 — SKR tab

- [x] T011 Formatters (compact supply, percent, signed amounts) with tests.
- [x] T012 `skrView` structured view, tests against the recorded wallet.
- [x] T013 `skrBlocks` for every state, tests.
- [x] T014 `useSkrScreenLogic`: supply, period change, SKR/day.
- [x] T015 Locales EN/ES.

## Phase 5 — Device gate

- [x] T016 Manifest `requires`, `allowlistForDevice`, tests.
- [x] T017 Mobile `useDeviceCapabilities`; both Homes apply the gate; `canPress` on the staking row.

## Phase 6 — Verify

- [x] T018 typecheck, lint, format, parity, i18n, bundle, secrets; shared, mobile, ui, extension tests.
- [ ] T019 Emulator screenshots at 320 / 393 / 430 pt; Seeker build shows SKR, plain Android does not.
