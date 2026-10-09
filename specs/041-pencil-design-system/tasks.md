---
description: 'Task list for 041 — Salmon Wallet design system in Pencil'
---

# Tasks: Salmon Wallet design system in Pencil

**Input**: Design documents from `specs/041-pencil-design-system/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tooling.md, quickstart.md

**Tests**: No test suites are requested. Verification is the feature's own
checks: variable lint, coverage diff and PNG-vs-runtime comparison (research R9).

**Organization**: Tasks are grouped by user story so each story can be checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: Which user story the task serves (US1–US5)
- **HUMAN**: Only the owner can do it; the tasks named in "Blocks" wait for it

## Path conventions

- `DS/` = `03-dev/Design System/` in the private SOT repo (plan §Project Structure).
- `$FRONTEND` = this repo's checkout on `feat/041-pencil-design-system`, which
  carries the baseline code (`feat/seeker-seed-vault` at `0c037b5f` on top of
  `origin/main` `31cd6541`). Nothing outside `specs/` changes in this repo.
- One writer per `.pen`: a builder writes a file only while it is closed in
  the Pencil app. Builders run through `DS/tools/pen-run.sh` (bash only, R4).
- Builder scripts can be **written** in parallel and tested on copies; they
  are **run** on the real file one at a time (contracts/tooling.md).

---

## Phase 1: Setup

**Purpose**: The SOT folder, the pen wrapper, and the owner's steps that unblock the runtime audit and the visual comparison.

- [x] T001 Create `DS/` with `tools/builders/`, `tools/maestro/`, `measurements/extension/`, `measurements/mobile/`, `exports/components/`, `exports/flows/`; check `pen version` reports 0.3.11 and `pen status` is Active
- [x] T002 Write `DS/tools/pen-run.sh` per contracts/tooling.md (`#!/bin/bash`, JSON-encode the builder, prepend `_helpers.js`, optional pre-command, `save()`/`exit()`, non-zero exit on `Error:` or `rolled back`)
- [x] T003 [P] Write `DS/tools/builders/_helpers.js`: `COMP` map from `Get(n => n.reusable)`, `ALIAS` read from the document's `imports` (empty in the library), text/icon/shadow helpers that accept only `$variable` names, and a `deleteGroup(prefix)` used for idempotent rebuilds
- [x] T004 [P] Create `DS/tools/empty.pen` (`{"version":"2.21","children":[]}`) and verify `pen-run.sh` with a one-line builder that inserts and deletes a frame under `document`
- [ ] T005 [P] HUMAN — Install the shipped DM Sans (the modified build in `$FRONTEND/packages/assets/src/fonts/`) and Geist Mono into the Pencil app. **Blocks**: T042, T049 (visual check)
- [x] T006 [P] HUMAN — Fill `$FRONTEND/apps/extension/.playwright/.env.test` from its `.env.test.example` with a test wallet that holds a little SOL and USDC on the test network. **Blocks**: T019, T021
- [ ] T007 [P] HUMAN — Fill `$FRONTEND/apps/mobile/.maestro/.env.test` from its `.env.test.example` and boot an iOS Simulator (390×844 class) with the mobile dev build installed. **Blocks**: T020, T021

---

## Phase 2: Foundational (inventory, tokens, audit harness)

**Purpose**: The three inputs every drawing needs. T008–T012 (inventory), T013–T016 (tokens and checks) and T017–T020 (audit harness) are independent tracks.

**⚠️ CRITICAL**: The library (Phase 3) starts once the inventory and the tokens are in; the runtime captures can land later (see T029).

- [x] T008 [P] Write `DS/tools/inventory.mjs`: for each folder in `$FRONTEND/packages/ui/src/components` and `$FRONTEND/apps/mobile/src/components`, emit `component, ui_path, mobile_path, contract` (the `XPropsBase` file in `packages/shared/src/types/ui`), the list of kit components it imports, and its `MOBILE_ONLY` / `DOM_ONLY` / `MOBILE_ONLY_SCREENS` note from `$FRONTEND/scripts/check-dom-parity.mjs` → `DS/inventory.raw.json`
- [x] T009 Run the Jev first pass (`typesafe:typesafe-ai`) over `DS/inventory.raw.json`: class ∈ `primitive|composite|container|page|motion-wrapper|material` and platform ∈ `both|mobile-only|extension-only`, with a confidence per row → `DS/inventory.csv` (research R7)
- [x] T010 Review every `DS/inventory.csv` row under the confidence threshold and a 20% random sample of the rest against the source; record `reviewed_by` and fix the class/platform where wrong
- [x] T011 Compute `in_key_flows` in `DS/inventory.csv` from the import graph of the key-flow entry points: mobile `app/(auth)/*`, `app/(app)/(tabs)`, `app/(app)/send`, `app/(app)/settings`, the Receive and Swap screens; DOM `AuthFlow`, `SendPage`, `ReceiveSheet`, `SwapPage`, `SettingsPanelStack` and the Home tab components
- [x] T012 Fill `drawn_as` in `DS/inventory.csv` for every `in_key_flows = yes` row (planned `Group/Variant` names from the twins' variant props, `template:<name>`, `screen`, or `not-drawn:<reason>`); this list sets the scope of builders 10–60
- [x] T013 [P] Write `DS/tools/export-tokens.ts` per research R2 and contracts/tooling.md: execute the theme modules with `$FRONTEND/node_modules/.bin/jiti`, alias to `palette.*` by value per mode, convert `rgba()` to `#RRGGBBAA`, split typography into five variables per style, export `colors.*` aliased where possible, record the baseline commits → `DS/tokens.manifest.json` + `DS/tools/builders/00-tokens.js`
- [x] T014 Run `00-tokens.js` on `DS/Salmon.lib.pen` (created from `empty.pen`, saved with the `.lib.pen` name); confirm `GetVariables().themes` is `{ mode: ["dark","light"] }`
- [x] T015 [P] Write `DS/tools/coverage.mjs`: diff `tokens.manifest.json` against the library's `GetVariables()` (name, type, value per mode) and `inventory.csv` `drawn_as` against the library's `COMP` map; print what is missing. Run it after T014 — the token half must print nothing
- [x] T016 [P] Write `DS/tools/lint-variables.js` (read-only builder, research R9): print `node · property · value` for every unbound fill, stroke, gap, padding, cornerRadius, opacity, typography and effect colour; accept a numeric width/height only when the node's `context` names its size token
- [x] T017 [P] Write `DS/tools/capture-extension.mjs` reusing `$FRONTEND/apps/extension/.playwright/fixtures.ts` and `helpers.ts` (pattern: `scripts/store-shots.mjs`): headless Chromium with the dev build, side panel at Chrome's default width; per state, screenshot + elements by `data-testid` and kit roots with box and computed styles; auto-flag `margin-between-siblings`, `absolute-outside-overlay`, `fixed-size-in-flex`, `colour-not-in-tokens` → `DS/measurements/extension/<flow>/<state>.{json,png}` (data-model). Never confirms send, swap or burn
- [x] T018 [P] Write `DS/tools/capture-mobile.sh` and the flows in `DS/tools/maestro/` (run from `$FRONTEND/apps/mobile/.maestro/`, reusing its subflows): per state `takeScreenshot` + `maestro hierarchy`, and a converter to `DS/measurements/mobile/<flow>/<state>.json` (bounds by `testID`)
- [x] T019 Add the Swap capture to `capture-extension.mjs`: open Swap, pick SOL→USDC, enter an amount, stop at the quote/review state; plus the dApp-approval window and the extension sheet container (requires T006)
- [ ] T020 Add `DS/tools/maestro/swap.yaml` (Swap to review only) and the mobile sheet container states to `capture-mobile.sh` (requires T007)
- [ ] T021 Capture every key-flow state on both platforms — Onboarding (welcome, create password, seed warning, seed shown with the public `abandon…` test phrase, success), Home (portfolio, NFTs tab, a sheet open), Send (recipient, amount, review), Receive, Swap (form, review), Settings (root, one panel, a selector) — plus both themes for Home and Send; mobile in full, the extension states that FR-010 needs (requires T006, T007, T017–T020)

**Checkpoint**: Inventory, tokens, lint/coverage and audit tools exist; captures may still be waiting on T006/T007.

---

## Phase 3: User Story 1 — One library of tokens and components (Priority: P1) 🎯 MVP

**Goal**: `DS/Salmon.lib.pen` with every token as a dark/light variable and every key-flow kit component as `Group/Variant` auto-layout components bound to variables.

**Independent Test**: Open only the library; switch a board holding every component to light; `lint-variables.js` prints nothing; `coverage.mjs` prints nothing.

Each builder below: write it from the twins' source and the inventory, test on a copy of the library, run it on the real file, then run `lint-variables.js` and export its board to `DS/exports/components/`. Builders can be written in parallel; they run in this order.

- [x] T022 [P] [US1] Write `DS/tools/builders/10-primitives.js` — every `in_key_flows` primitive (Icon, IconBubble, TokenLogo, Spinner, Toggle, Chip, Pill, SectionLabel, TextInput, Button…) with one component per variant; component measurements as component tokens (FR-007)
- [x] T023 [P] [US1] Write `DS/tools/builders/20-fields-rows.js` — ListRow, KeyValueRow, SearchField, PasswordInput, AddressCopyRow, StatTile, ProgressBar and the other row/field composites, built only from `COMP` instances of 10
- [x] T024 [P] [US1] Write `DS/tools/builders/30-cards-blocks.js` — Card, FactsCard, BlockList, AmountEntryCard, TokenList, BalanceHeader, WalletHeader and the other blocks, with slots where the code takes children
- [x] T025 [P] [US1] Write `DS/tools/builders/40-headers-navigation.js` — ScreenHeader, UnderlineTabs, PortfolioSubTabs, StepIndicator and the other navigation pieces
- [x] T026 [P] [US1] Write `DS/tools/builders/50-materials.js` — DepthBackground, WaterColumn, Thermocline, ScalesBackground, FleshBackground as native approximations (gradients, `background_blur`, shadows bound to variables), each with a `context` label naming the code that renders the real material and a motion note (FR-012); no scripts or shaders
- [x] T027 [P] [US1] Write `DS/tools/builders/60-feedback.js` — WarningNotice, StateBlock, SkeletonRow, PendingActivityBanner and the other feedback pieces
- [x] T028 [US1] Run builders 10→60 on `DS/Salmon.lib.pen` in order, with `lint-variables.js` and the PNG export after each; fix the builder, never the file by hand
- [ ] T029 [US1] Once T021 has landed, compare each component's drawn sizes, paddings and gaps with its measurements (`DS/measurements/**`); correct the builder where the drawing is wrong, and log as a finding candidate in `DS/findings.candidates.json` where the code reaches the right look through the wrong structure (FR-013/FR-014)
- [x] T030 [US1] Build a `Library/All` board in `DS/Salmon.lib.pen` with one instance of every component; export it with `theme: { mode: "dark" }` and `"light"`; check every component flips with no manual edit (SC-004); `lint-variables.js` and `coverage.mjs` both print nothing (SC-001, SC-002)

**Checkpoint**: US1 is reviewable alone.

---

## Phase 4: User Story 2 — Layout templates per platform container (Priority: P2)

**Goal**: Five templates in `DS/Salmon Screens.pen`, measured from runtime.

**Independent Test**: Instantiate each template, drop a library component in its content slot; it stretches and spaces correctly; outer size and insets within 1px of the measured container.

- [x] T031 [US2] Create `DS/Salmon Screens.pen` from `empty.pen` and run `import_library({ path: "Salmon.lib.pen" })`; confirm the library components appear as `<alias>:<id>` and the theme axis as `<alias>:mode` (research R1)
- [x] T032 [US2] Write and run `DS/tools/builders/70-templates.js`: `Template/Mobile Screen` (390×844, safe areas as padding), `Template/Mobile Sheet`, `Template/Extension Side Panel` (measured default width, `panelTop`), `Template/Extension Approval Window`, `Template/Extension Sheet` (the `<dialog>`), each with `header`/`title`, `content`, `actions` slots; no absolute nodes except real overlays (data-model)
- [x] T033 [US2] Check each template against the container measurements from T021 (≤ 1px on outer size, insets and paddings); record any mismatch the code causes as a finding candidate

---

## Phase 5: User Story 3 — Key flows drawn from the library (Priority: P2)

**Goal**: The six key flows as boards built only from templates and library instances, both themes, mobile in full plus extension container deltas.

**Independent Test**: Each board sits next to its runtime screenshot; every element is an instance, template or bound text; positions and sizes match within 2px or are listed in the findings.

Use `product.pen` (the 2026-09 redesign drawing) as a structural reference only — never its colours (D3, R11). Builders are written in parallel and run one at a time on `DS/Salmon Screens.pen`.

- [x] T034 [P] [US3] Write `DS/tools/builders/80-flow-onboarding.js` — `Flow/Onboarding/NN <State>` boards for every captured onboarding state; the seed board shows the public `abandon…` test phrase only
- [x] T035 [P] [US3] Write `DS/tools/builders/80-flow-home.js` — portfolio, NFTs tab, a sheet open; SKR and Staking surfaces from `feat/seeker-seed-vault` labelled with the branch (FR-018)
- [x] T036 [P] [US3] Write `DS/tools/builders/80-flow-send.js` — recipient, amount, review
- [x] T037 [P] [US3] Write `DS/tools/builders/80-flow-receive.js` — the Receive sheet/screen
- [x] T038 [P] [US3] Write `DS/tools/builders/80-flow-swap.js` — form and review (Swap is drawn from `main`, research/spec assumptions)
- [x] T039 [P] [US3] Write `DS/tools/builders/80-flow-settings.js` — root, one panel, one selector
- [x] T040 [US3] Write `DS/tools/builders/85-extension-deltas.js` — only the states whose extension container differs (side panel frame, approval window, extension sheets), reusing the mobile board content inside the extension templates (FR-010)
- [x] T041 [US3] Run 80-* then 85 on `DS/Salmon Screens.pen`; export every board in both themes (`<alias>:mode`) to `DS/exports/flows/`; `lint-variables.js` prints nothing for the screens file
- [ ] T042 [US3] Compare each exported board with its runtime screenshot and per-element bounds (≤ 2px); fix the builder or add a finding candidate per deviation (SC-003). Requires T005 (fonts) and T021

---

## Phase 6: User Story 4 — Findings report (Priority: P3)

**Goal**: `DS/Findings.md`, one row per code-vs-structure difference, reproducible from the row alone.

**Independent Test**: Three random findings reproduce in the running app and at the code location they name in under 10 minutes each (SC-005).

- [x] T043 [US4] Consolidate the auto-flags from `DS/measurements/extension/**` and the candidates from T029, T033, T042 into `DS/Findings.md` with the data-model fields (`id`, kind, where, `code path:line` at the baseline commit, measured, drawn, fix, severity)
- [x] T044 [P] [US4] Add `twin-divergence` findings: components whose mobile and extension runtime measurements disagree with each other (from T021 data)
- [x] T045 [P] [US4] Add `design-md-mismatch` and `legacy-token` findings: where `$FRONTEND/DESIGN.md` names a value the theme does not encode, and every component bound to `colors.*` instead of `semantic.*`
- [x] T046 [US4] Pick three findings at random and reproduce each from its row alone; fix any row that cannot be reproduced

---

## Phase 7: User Story 5 — The note (Priority: P3)

**Goal**: `DS/Design System.md` that tells anyone what the design system is and how to keep it in sync.

**Independent Test**: Passes the SOT vault rules; every file it names exists.

- [x] T047 [US5] Write `DS/Design System.md`: frontmatter `title`/`status`/`owner`/`reviewed` (owner: Luca and Darío, as for code), plain-language opening line, where the files are, the baseline record (`origin/main` `31cd6541` + `feat/seeker-seed-vault` `0c037b5f`), the pen CLI version pinned (0.3.11) with the R1 probe to re-run after upgrades, the font prerequisite, how to rebuild (quickstart), how to switch themes (`<alias>:mode`), what is deliberately not drawn
- [x] T048 [US5] Run the SOT's own document checks (per the SOT `AGENTS.md`) on `DS/Design System.md` and `DS/Findings.md`; fix until clean

---

## Phase 8: Polish & close-out

- [x] T049 Rebuild both files from scratch per quickstart.md, unattended (tokens → 10–60 → 70 → 80/85), into temporary copies; confirm the result matches the committed files (node counts, variable counts, lint empty) — proves the builders, not hand edits, are the source
- [x] T050 Commit the SOT changes (`DS/**` except captured screenshots containing wallet data, if any) on a branch in the SOT repo, following its commit rules; do not push without the owner's word
- [ ] T051 HUMAN — The owner reviews the six flows in `DS/Salmon Screens.pen` (both themes) and says they replace `product.pen`. **Blocks**: T052
- [ ] T052 After T051 only: locate `product.pen` with the owner (confirm which copy, and any duplicate), then move it to the macOS Trash with `mv <path> ~/.Trash/` — never `rm`; report the path moved (D3)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (1)**: none. T005–T007 are owner tasks and block only what they name.
- **Foundational (2)**: after T001–T004. Three tracks run in parallel: inventory (T008→T009→T010→T011→T012), tokens (T013→T014, with T015/T016 alongside), audit harness (T017, T018 in parallel → T019/T020 → T021, gated by T006/T007).
- **US1 (3)**: builders written after T012 and T014; run in order (T028); T029 waits for T021; T030 last.
- **US2 (4)**: after T028 (library exists). T033 waits for T021.
- **US3 (5)**: after T032. T042 waits for T005 and T021.
- **US4 (6)**: after T029, T033, T042 and T021.
- **US5 (7)**: can be drafted any time after T031; finished after US4.
- **Polish (8)**: after everything; T052 strictly after T051.

### What the owner's steps block

| Owner step                          | Blocks                                             |
| ----------------------------------- | -------------------------------------------------- |
| T005 fonts                          | T042 (and any PNG comparison), T049's visual check |
| T006 extension `.env.test`          | T019, T021 → T029, T033, T042, T043–T046           |
| T007 mobile `.env.test` + simulator | T020, T021 → same chain                            |
| T051 flow review                    | T052                                               |

Everything else (inventory, tokens, lint, coverage, all builders, the library, templates and flow drawings) proceeds without them.

## Parallel examples

```text
# Foundational — three tracks at once
T008 inventory.mjs      | T013 export-tokens.ts | T017 capture-extension.mjs
                        | T015 coverage.mjs      | T018 capture-mobile.sh
                        | T016 lint-variables.js |

# US1 — write all builders at once, run them in order
T022 10-primitives | T023 20-fields-rows | T024 30-cards-blocks
T025 40-headers    | T026 50-materials   | T027 60-feedback
→ T028 run 10→60 sequentially on Salmon.lib.pen

# US3 — six flow builders at once, then one run
T034 … T039 → T040 → T041
```

## Implementation strategy

1. **MVP = US1**: Setup → Foundational (inventory + tokens) → US1 builders →
   T030. A themed, linted library is reviewable before any capture exists.
2. Then US2 templates and US3 flows (drawn from code + inventory); their runtime
   comparisons (T033, T042) land when the owner's steps are done.
3. US4 findings once captures and comparisons exist; US5 note last.
4. Close-out: unattended rebuild, SOT commit, owner review, `product.pen` to
   the Trash.

## Notes

- Tasks touch only the SOT and `specs/041-…/`. No app code, tokens or
  `DESIGN.md` change (spec out of scope).
- Never broadcast; never capture a real seed; secrets stay in the gitignored env files.
- Commit after each phase in the SOT; one writer per `.pen` at all times.
