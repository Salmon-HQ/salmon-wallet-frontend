# Quickstart: Salmon Wallet design system in Pencil

How to run the pieces once the tasks have built them. Paths below are relative
to the SOT root unless they start with `$FRONTEND` (the frontend checkout,
on `feat/seeker-seed-vault` at the baseline commit, or later).

## Prerequisites

- pen CLI ≥ 0.3.11 (`pen version`), logged in (`pen status` → Active).
- The shipped DM Sans and Geist Mono installed in the Pencil app (owner).
- Both `.pen` files **closed** in the Pencil app while a script writes them.
- For captures: `$FRONTEND/apps/extension/.playwright/.env.test` and
  `$FRONTEND/apps/mobile/.maestro/.env.test` filled with test-wallet values; an
  iOS Simulator booted with the dev build; the extension dev build
  (`pnpm --filter @salmon/extension dev` output in `dist/chrome-mv3-dev`;
  `wxt build` bakes the production API, the dev build reads the local env).

## Rebuild the library from scratch

```bash
cd "03-dev/Design System"
FRONTEND=../../../salmon-wallet-frontend
$FRONTEND/node_modules/.bin/jiti tools/export-tokens.ts $FRONTEND
cp tools/empty.pen Salmon.lib.pen
for b in tools/builders/[0-6]*.js; do tools/pen-run.sh Salmon.lib.pen Salmon.lib.pen "$b" || break; done
tools/pen-run.sh Salmon.lib.pen /tmp/lint.pen tools/lint-variables.js   # expect no output
node tools/coverage.mjs                                                 # expect nothing missing
```

## Rebuild the screens

```bash
cp tools/empty.pen "Salmon Screens.pen"
tools/pen-run.sh "Salmon Screens.pen" "Salmon Screens.pen" tools/builders/70-templates.js 'import_library({ path: "Salmon.lib.pen" })'
for b in tools/builders/8*.js; do tools/pen-run.sh "Salmon Screens.pen" "Salmon Screens.pen" "$b" || break; done
```

## Capture runtime for one flow

```bash
node tools/capture-extension.mjs send       # → measurements/extension/send/*.json|png
tools/capture-mobile.sh send                # → measurements/mobile/send/*.json|png
```

## Check a flow board against runtime

Open `exports/flows/send-03-review@2x.png` next to
`measurements/mobile/send/review.png`; differences above 2px either get fixed
in the drawing or become a row in `Findings.md`.

## Switch a board's theme

In the screens file the theme axis is the library's: select the board and set
`<alias>:mode` to `light` (the alias is the key under `imports`), or in a
builder `Update(boardId, { theme: { [ALIAS + ":mode"]: "light" } })`.
