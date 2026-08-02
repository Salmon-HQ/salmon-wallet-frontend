# AGENTS.md — salmon-wallet-v3

Guidance for any AI agent or automated contributor working in this repo,
regardless of vendor or tool. **This file is the canonical source of truth
for repo rules.** Tool-specific files (`CLAUDE.md`, `.claude/`, `.codex/`,
`.agent/`) point here; if any of them disagrees with this file, this file
wins. Read `docs/ARCHITECTURE.md` before structural changes.

## What this repo is

An open-source, self-custodial crypto wallet (Solana-first, with Bitcoin
and a future-facing Ethereum surface) shipped as three apps from one
pnpm + turbo monorepo. The same business logic powers all three apps, so
ownership boundaries are the core discipline of this codebase.

## Ownership model

| Location | Owns | Why |
|---|---|---|
| `packages/shared` | Cross-platform logic and contracts: API services, blockchain logic, hooks, semantic types, storage, config, crypto, utils, i18n locales, theme tokens | One implementation serves mobile, web, and extension; a bug fixed here is fixed everywhere |
| `packages/ui` | Shared React DOM components used by web and extension | DOM code cannot run in React Native, so it must not live in `packages/shared` |
| `apps/mobile` | React Native / Expo app, mobile-only flows, native integrations | RN code cannot run in browsers; keeping it app-local prevents platform leaks into shared packages |
| `apps/web` | Web app shell, routing, providers, browser-specific wiring | App-shell concerns are not reusable; keeping them local keeps shared packages runtime-agnostic |
| `apps/extension` | Extension entrypoints (background/content/injected), pages, sheets, browser-extension APIs | Extension runtime constraints (MV3, WXT) must not constrain the other apps |

## Placement rules

- Cross-platform services, hooks, blockchain logic, semantic types, storage,
  and shared config go in `packages/shared` — so all three apps consume one
  contract instead of drifting copies.
- Shared DOM components go in `packages/ui`, never in `packages/shared` —
  `packages/shared` must stay importable from React Native.
- React Native code stays in `apps/mobile`; `apps/mobile` must not import
  `@salmon/ui` — it is DOM-only and would break the native bundle.
- Browser-only and extension-only runtime code stays in the owning app —
  platform APIs leaking into shared code break the other platforms silently.
- Prefer extending an existing shared contract over duplicating types or
  service wrappers in an app — duplicates drift and double the fix surface.
- Cross-platform component contracts (`PropsBase`-style types) live in
  `packages/shared/src/types/ui`; visual/platform-specific props extend them
  locally per platform.
- `packages/shared/src/theme` is the single source of design tokens — no
  hardcoded colors/spacing/typography in apps, or visual drift creeps in.
- Public barrels expose named exports only — named exports keep re-exports
  greppable and tree-shakeable.

Detailed decision matrices (by platform scope, by artifact type, anti-patterns)
live in `.agent/skills/salmon-repo-rules/references/`.

## Changing or removing existing code

Shared code has three consumers. Before modifying or deleting anything in
`packages/shared` or `packages/ui`:

1. Find the actual consumers (all apps and packages) of the export you are
   touching — an export that looks dead in one app may be load-bearing in
   another.
2. Preserve stable export paths and barrels unless the task explicitly
   allows breakage — renames ripple through three apps at once.
3. If backend-facing behavior changes, check the sibling backend repo
   `../salmon-api` (clone it next to this repo if needed) —
   `packages/shared/src/api` is the canonical frontend contract with it.
4. Run the smallest relevant tests before and after the change, and report
   what was verified and what was intentionally preserved.
5. Preserve the future-facing Ethereum surface
   (`packages/shared/src/blockchain/ethereum` and related types) unless
   removal is explicitly requested — it is intentional scaffolding for
   planned multi-chain support, not dead code.

## Security-sensitive areas

This is a wallet: mistakes here can lose user funds. Treat these paths as
high-sensitivity — do not change their behavior without explicit human
sign-off, and give changes near them extra scrutiny:

- `packages/shared/src/crypto` and `packages/shared/src/storage` (key
  material, seed encryption, persistence)
- transaction building/signing paths in `packages/shared/src/blockchain`
- auth/lock/recovery flows in any app

Never log, echo, screenshot, or commit seed phrases, private keys, or
passwords — including in tests and E2E flows (test secrets live in
gitignored `.env.test` files). Never perform irreversible on-chain actions
(send, swap, burn) or credential operations (e.g. mobile keystore changes)
autonomously; confirm with the human first.

## When in doubt, ask the human

Stop and ask 1–3 focused questions instead of guessing whenever any of
these is ambiguous — a wrong guess here is expensive to unwind:

- Placement: `packages/shared` vs `packages/ui` vs an app; is the code
  truly used by more than one platform?
- Shared-vs-app boundary: does a platform dependency (browser API, RN API,
  navigation, biometrics) make it app-local?
- Public exports: does the change alter an export path, barrel, or contract
  other apps consume?
- Contract impact: does a backend, blockchain, or cross-platform UI
  contract change shape?
- Removal of anything related to the Ethereum surface.
- Translations: never guess a Spanish translation (see i18n below).
- Anything in the security-sensitive areas above.

If the answer could change code placement, API shape, or test scope, ask
first. The repo skills encode more granular clarification gates per task
type.

## Code navigation for agents

If a code-graph / semantic-search / blast-radius tool is available in your
harness (for example, a prebuilt graph database in the repo or an
impact-analysis tool exposed by your environment), prefer it over raw
grep/glob/file-reading for exploration and consumer/impact analysis — it is
cheaper in tokens and better at finding indirect consumers. This is
optional: fall back to grep/glob/read when no such tool exists or it does
not cover what you need (dynamic dispatch, generated code, very recent
changes). Always verify graph-derived claims against the actual source
before acting on them — graphs reflect parse-time structure, not runtime
behavior.

## Verification

Run targeted checks for the packages you touched (fast feedback beats a
full-repo run):

- Typecheck: `pnpm turbo run typecheck --filter=@salmon/<pkg>`
- Tests: `pnpm turbo run test --filter=@salmon/<pkg>`
  (packages/shared and packages/ui use Vitest; apps/mobile uses Jest)
- Lint: `pnpm turbo run lint --filter=@salmon/<pkg>`

Package names: `@salmon/shared`, `@salmon/ui`, `@salmon/mobile`,
`@salmon/web`, `@salmon/extension`.

## Testing rules

- Prioritize functional tests over UI/UX tests — business logic bugs in a
  wallet are costlier than visual regressions.
- Add UI/UX tests only when a visible behavior should work differently and
  the failure is user-relevant.
- Prefer unit and integration coverage in the owning package before adding
  E2E coverage — E2E is slower and flakier per bug caught.
- Backend-dependent E2E tests may target `../salmon-api` running in Docker.
  Before adding one, check whether `../salmon-api` already covers the
  behavior to avoid redundant tests.
- Tests that depend on backend availability must **skip** when the backend
  is unreachable, but must **fail** (not skip) when the backend is reachable
  and the behavior is wrong — silent skips on a live backend hide real
  contract breaks.

## End-to-end test suites — per-app ownership

E2E suites live next to the app they exercise. Do not create a top-level
`.playwright/` or `.maestro/`.

| App | Suite | Tool |
|---|---|---|
| `apps/extension` | `apps/extension/.playwright/` | Playwright (chromium + extension load) |
| `apps/web` | `apps/web/.playwright/` | Playwright (chromium against the web dev server) |
| `apps/mobile` | `apps/mobile/.maestro/` | Maestro (iOS Simulator / Android emulator) |

Each suite has its own `README.md` (setup) and `AGENTS.md` (conventions,
known failure modes) — read those before extending a suite. Secrets stay in
gitignored `<suite>/.env.test` with a committed `.env.test.example`.
Suite-local outputs (`screenshots/`, `snapshots/`, `reports/`, `profiles/`,
`fixtures/`) are gitignored. Cross-suite code belongs in `packages/shared`
or `packages/ui` only when more than one suite needs it.

Maestro must be invoked from `apps/mobile/.maestro/` — screenshot paths
resolve against the cwd, so any other cwd litters stray directories. Details
in `apps/mobile/.maestro/AGENTS.md`.

## i18n

Every user-facing string must exist in both English and Spanish translation
files, referenced via `t('key.path')` — hardcoded copy breaks localization
for half the user base. Follow the `i18n-authoring` skill; never guess a
translation.

## Skills — detailed how-to

Repo-local skills carry the detailed workflows this file intentionally does
not duplicate. The canonical body of each skill is
`.agent/skills/<name>/SKILL.md` (mirrored for specific tools in
`.claude/skills/` and `.codex/skills/`). When a task matches a skill's
scope, open its `SKILL.md` and follow it.

| Skill | Use for |
|---|---|
| `salmon-repo-rules` | Placement, ownership, boundary, export, and audit decisions (detailed matrices in its `references/`) |
| `api-service-authoring` | Shared API services in `packages/shared/src/api/services` (caching, DI adapters, client selection) |
| `shared-test-authoring` | Vitest tests for `packages/shared` (hooks, services, blockchain, crypto, config) |
| `ui-component-scaffold` | Shared DOM components in `packages/ui`, incl. cross-platform contract flow |
| `ui-test-authoring` | Tests for `packages/ui` components |
| `mobile-component-scaffold` | React Native components in `apps/mobile`, incl. contract + mobile implementation |
| `mobile-test-authoring` | Jest tests for `apps/mobile` |
| `e2e-test-labels` | Stable `testID` / `data-testid` / a11y labels so Maestro and Playwright can select elements |
| `i18n-authoring` | Adding, changing, or auditing user-facing copy and translation keys |

Usage: load only what the task needs (read the relevant `SKILL.md` and only
the reference files it points to); if several skills apply, state which and
in what order; if a skill cannot be applied cleanly, say so and continue
with the closest fallback.

For Solana Kit / Wallet Standard work, agents can install the official
Solana Foundation dev skill: `npx skills add solana-foundation/solana-dev-skill`.

Optional MCP servers for Solana work — acceleration, not requirements: the
Foundation's hosted docs server (https://mcp.solana.com — live
Solana/Anchor/Kit documentation lookup) and Helius's MCP
(`claude mcp add helius npx helius-mcp@latest` — DAS/asset queries).

## Folder guidance

- Nested `AGENTS.md` files exist only in folders with real ownership
  boundaries or platform-specific constraints; they refine — never
  contradict — this file.
- Prefer package-level or app-level guidance over file-by-file instruction
  clutter.

## Documentation rules

- Put durable repo docs in `docs/`.
- Keep docs responsibility-oriented: ownership and package-boundary
  guidance over file-by-file inventories, unless the task explicitly asks
  for file-level documentation.
