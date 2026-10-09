# Contract: design-system tooling

The interfaces the tasks build against. All of it lives in the SOT under
`03-dev/Design System/tools/` (plan §Decisions D2) and takes the frontend
checkout as an argument (`FRONTEND=<path>`).

## `pen-run.sh <in.pen> <out.pen> <builder.js> [pre-command]`

- `#!/bin/bash` (never zsh — research R4). JSON-encodes `builder.js`, pipes
  `[pre-command]`, `execute({ input })`, `save()`, `exit()` into
  `pen interactive -i <in> -o <out>`; strips `WARN`/`INFO` and base64 lines.
- Exit status non-zero when the output contains `Error:` or
  `rolled back`, so a failed builder never looks like a success.
- `in` and `out` may be the same file. The file must be closed in the app.

## Builder script (`builders/NN-<name>.js`)

Run in order on the real file by the coordinator; each is tested first on a
copy.

1. Starts with the shared helpers block (`builders/_helpers.js`, prepended by
   `pen-run.sh`): `COMP` map built with
   `Get(n => { if (n.reusable) COMP[n.name] = n.id })`, text/icon/shadow
   helpers that only take variable names.
2. Inserts under `document`, names every node, never hard-codes an id it did
   not just receive from `Insert`.
3. Never calls `SetVariables` — only `00-tokens.js` does.
4. Is idempotent: deletes the component(s) of its own `Group/` before
   re-inserting them.
5. Ends with `Print` of `name → id` for what it created and one
   `Export([...], "png", "exports/components", { scale: 2 })` per board.

Order (library): `00-tokens` → `10-primitives` (Icon, IconBubble, TokenLogo,
Spinner, Toggle, Chip, Pill, SectionLabel, TextInput, Button…) → `20-fields
and rows` (ListRow, KeyValueRow, SearchField, PasswordInput, AddressCopyRow,
StatTile, ProgressBar…) → `30-cards and blocks` (Card, FactsCard, BlockList,
AmountEntryCard, TokenList, BalanceHeader, WalletHeader…) → `40-headers and
navigation` (ScreenHeader, UnderlineTabs, PortfolioSubTabs, StepIndicator…) →
`50-materials` (DepthBackground, WaterColumn, Thermocline, ScalesBackground,
FleshBackground) → `60-feedback` (WarningNotice, StateBlock, SkeletonRow,
PendingActivityBanner…). The exact list per file comes from the inventory
(`in_key_flows = yes`); a component is built only after everything it
contains.

Order (screens): `70-templates` → `80-flow-<flow>` × 6 (Onboarding, Home,
Send, Receive, Swap, Settings) → `85-extension-deltas`.

## `export-tokens.ts` → `tokens.manifest.json` + `00-tokens.js`

- Run: `$FRONTEND/node_modules/.bin/jiti tools/export-tokens.ts $FRONTEND`.
- Reads the theme modules listed in research R2 from
  `$FRONTEND/packages/shared/src/theme`; writes the manifest (data-model) and
  a generated `builders/00-tokens.js` whose only call is one
  `SetVariables({...})` with every token.
- Fails if any colour cannot be converted to `#RRGGBB[AA]`.

## `capture-extension.mjs <flow> [state]`

- Uses `$FRONTEND/apps/extension/.playwright` fixtures and its gitignored
  `.env.test`; headless Chromium with the dev build loaded.
- Writes `measurements/extension/<flow>/<state>.json` + `.png` (data-model).
- Never confirms a send, swap or burn; stops at review.

## `capture-mobile.sh <flow>`

- Runs from `$FRONTEND/apps/mobile/.maestro/` (screenshot paths are
  cwd-relative) a flow under `tools/maestro/` that calls the suite's
  subflows, `takeScreenshot`s each state, and saves `maestro hierarchy` JSON.
- A converter writes `measurements/mobile/<flow>/<state>.json` (bounds by
  `testID`).

## `lint-variables.js` (builder-style, read-only)

- Walks every node of a file; prints `nodeName · property · value` for each
  unbound value (research R9). Run with `pen-run.sh` against a copy;
  zero output lines is the pass.

## `coverage.mjs`

- Diffs `tokens.manifest.json` against `GetVariables()` output and the
  inventory against the library's `COMP` map; prints what is missing.
