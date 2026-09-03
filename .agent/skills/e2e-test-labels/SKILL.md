---
name: e2e-test-labels
description: "Add and maintain stable test/accessibility labels (testID, data-testid, accessibilityRole/Label, aria-label, semantic roles) on components, screens, and pages so Maestro flows and Playwright suites can select elements reliably. Use whenever creating or modifying interactive UI in apps/mobile, apps/extension, or packages/ui, or when a cross-platform contract in packages/shared/src/types/ui gains a new interactive element. Use together with mobile-component-scaffold, ui-component-scaffold, and salmon-repo-rules whenever new UI is built."
---

# E2E Test Labels

Maestro (mobile) and Playwright (extension) become reliable only when the UI tree exposes stable, semantic identifiers. Text-based selection breaks on copy changes and i18n. This skill defines the labeling convention so every new or modified interactive element is targetable from both harnesses without brittle CSS/text matching.

## How each harness selects

- **Maestro** `id` selector ← React Native `testID`. `text` selector matches visible text **and** accessibility label (iOS `accessibilityLabel` / Android `contentDescription`), regex by default. Prefer `id`; text is fallback only.
- **Playwright** locator priority: `getByRole` (role + accessible name) > `getByText` > `getByLabel` > `getByPlaceholder` > `getByTestId`. CSS/XPath discouraged. `getByTestId` reads `data-testid` by default.
- The two ecosystems use **different attribute names** (`testID` vs `data-testid`) for the same logical element. Thread one semantic prop, map per platform.

## Convention

1. **One canonical id string per logical element.** kebab-case: `<screen>-<element>[-<role>]` — e.g. `lock-password-input`, `lock-unlock-button`, `send-amount-input`, `home-balance-card`. Use the **same string** on mobile and DOM so both suites share one selector vocabulary.
2. **Lists/dynamic items: parametrize.** `token-row-${symbol}`, `account-item-${index}`. Never rely on Maestro `index:` or Playwright `.nth()` positionally.
3. **Semantic prop threading.** When the element comes from a shared contract (`packages/shared/src/types/ui/*PropsBase`), add an optional `testID?: string` to the contract. Mobile implementation forwards it to `testID`; DOM implementation forwards it to `data-testid`. App-local components accept the prop directly.
4. **Identity AND semantics — set both:**
   - Mobile: `testID` (primary selector) + `accessibilityRole` + `accessibilityLabel` (defaults to the visible text) + `accessibilityState` for `disabled`/`loading`/`busy`.
   - DOM: `data-testid` (primary selector) + correct implicit role (`<button>`, `<input>`) + `aria-label` on icon-only / text-less controls.
5. **Inputs: id on the `<input>`, not the wrapper.** The kit's `TextInput`/`PasswordInput` forward `testID` to the element itself; a bespoke wrapper must do the same, or Playwright matches the container and `.fill()` fails.
6. **Keep copy coherent as a secondary net** — Maestro `text` is regex and a readable fallback, but never the primary selector.

## Priority for new work

Add ids in this order (highest selector fragility first):
1. Icon-only / text-less controls (today these force `aria-label*=`, `img[alt*=]`, CSS).
2. Inputs and submit buttons in auth/transaction flows.
3. Dynamic list rows and cards.
4. Static navigational elements (text fallback is acceptable but id preferred).

## Workflow when building/modifying UI

1. Identify the interactive elements the screen exposes.
2. Assign canonical id strings (reuse existing strings if the same logical element already has one on another platform — search before inventing).
3. If shared contract, thread `testID?` through the `*PropsBase` type, then both platform implementations.
4. Apply id + a11y per the convention above.
5. If a Maestro flow (`apps/mobile/.maestro/`) or Playwright suite (`apps/{web,extension}/.playwright/`) already exercises this screen, update it to select by `id`/`getByTestId` instead of text/CSS.

## Clarification gate

Ask before proceeding if:
- The same logical element already has a different id on another platform (align, don't fork).
- Adding `testID?` to a shared contract would touch many consumers — confirm the contract change scope.
- An element is intentionally text-only/decorative (skip id) vs interactive (needs id).

## Rules

- Never use CSS class names, `input[type=...]`, or `.nth()`/`index:` as a primary selector when an id can be added.
- Canonical id strings are immutable once flows depend on them — renaming is a breaking change to both suites.
- Do not change user-visible copy to fix a selector; add an id instead.
- Mirror any new convention detail here and keep `AGENTS.md` + the scaffold skills' pointers in sync.

## Tooling that amplifies this

- **Maestro MCP** (`claude mcp add maestro -- maestro mcp`): `inspect_screen` returns the live view hierarchy — ids show up directly, so labeled trees generate clean YAML.
- **Playwright Test Agents** (`npx playwright init-agents --loop=claude`): the Generator verifies selectors live; labeled DOM yields stable `getByRole`/`getByTestId` instead of CSS. (Note: current suites are custom `.mjs` ESM drivers, not `@playwright/test` — adopting the runner is a separate decision.)
