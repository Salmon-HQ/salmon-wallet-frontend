# Salmon Wallet Constitution

This constitution governs every spec, plan, and task produced for this repo.
It restates the non-negotiables from `AGENTS.md` in the form spec-kit checks
against. Where the two ever disagree, `AGENTS.md` wins and this file is
amended to match.

## Core Principles

### I. Ownership boundaries are the architecture

The same business logic powers both apps, so where code lives is the primary
design decision, not a filing preference.

- Cross-platform logic, contracts, hooks, blockchain code, storage, config and
  i18n go in `packages/shared`, which must stay importable from React Native.
- Shared DOM components go in `packages/ui`; `apps/mobile` must never import
  `@salmon/ui`.
- Platform-specific runtime code stays in its owning app.

A spec that places code outside these boundaries is rejected regardless of how
convenient the placement is.

### II. Shared code has three consumers

Before changing or deleting anything in `packages/shared` or `packages/ui`, a
spec must name the actual consumers across all apps and packages. Export paths
and barrels stay stable unless breakage is explicitly in scope. An export that
looks dead in one app may be load-bearing in another.

Backend-facing changes are checked against the sibling repo `../salmon-wallet-backend`;
`packages/shared/src/api` is the canonical frontend contract with it.

### III. Wallet safety over everything (NON-NEGOTIABLE)

Mistakes in this codebase lose user funds. These paths require explicit human
sign-off before their behavior changes:

- `packages/shared/src/crypto` and `packages/shared/src/storage`
- transaction building and signing in `packages/shared/src/blockchain`
- auth, lock and recovery flows in any app

Seed phrases, private keys and passwords are never logged, echoed,
screenshotted or committed — including in tests and E2E flows. Irreversible
on-chain actions and credential operations are never performed autonomously.

### IV. Every user-facing string is bilingual

Copy is referenced via `t('key.path')` and exists in both the English and
Spanish translation files. Hardcoded strings in components are a defect, not a
shortcut: they break localization for half the user base and bypass review of
what the user actually reads. Translations are never guessed.

### V. Functional coverage before visual coverage

Business-logic bugs cost more than visual regressions. Cover behavior in the
owning package with unit and integration tests before reaching for E2E, which
is slower and flakier per bug caught. E2E suites live next to the app they
exercise and never at the repo root.

Tests that depend on a backend skip when it is unreachable and fail when it is
reachable and the behavior is wrong. A silent skip against a live backend
hides a real contract break.

### VI. Ask rather than guess

Placement, shared-vs-app boundaries, public exports, contract shape,
translations, anything touching the security-sensitive paths, and any removal
of the Ethereum surface are clarification gates. A spec carrying an unresolved
question in any of these areas is not ready to plan.

## Platform Constraints

Some changes cannot ship over the air and must be called out in the spec:

- **Native config** — anything reaching `Info.plist`, `AndroidManifest.xml`,
  entitlements, permissions, plugins or the splash screen requires a prebuild
  and a new store binary. `apps/mobile/ios` and `apps/mobile/android` are
  generated and gitignored; `app.json` is the source of truth and native
  directories are never edited directly.
- **JS-only** — component, copy and logic changes reach mobile via OTA and the
  extension via a new store build.

Identifiers locked by published artifacts are never renamed as part of another
change: the bundle identifier and Android package (`io.salmonwallet.app`), the
Expo slug and EAS `projectId`, the `salmonwallet://` scheme, the Firefox
add-on id, and the Wallet Standard name `'Salmon'` advertised to dApps by the
extension.

`packages/shared/src/theme` is the single source of design tokens. Specs do
not introduce hardcoded colors, spacing or typography.

## Quality Gates

A feature is done when all of the following hold:

- `pnpm typecheck` is clean.
- `pnpm lint` reports **zero errors and zero warnings**. A standing warning
  list hides the next real one.
- Tests pass for every touched package (`packages/shared` and `packages/ui`
  use Vitest; `apps/mobile` uses Jest).
- New behavior has a test at the nearest meaningful layer, and any renamed
  `testID` / `data-testid` has been traced through the Maestro and Playwright
  suites that select on it.
- Diffs carry no commentary beyond what is genuinely non-obvious. This repo is
  public; commits are read by people who were not in the room.

## Governance

This constitution supersedes convenience. Complexity must be justified in the
spec that introduces it, and the justification must survive the question "what
breaks if we don't build this".

Amendments require a matching change to `AGENTS.md` and a note of what
prompted them.

**Version**: 1.0.0 | **Ratified**: 2026-08-10 | **Last Amended**: 2026-08-10
