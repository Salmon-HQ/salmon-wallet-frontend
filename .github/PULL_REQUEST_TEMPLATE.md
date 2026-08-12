<!--
Title must be a Conventional Commit (CI checks it):
  feat | fix | refactor | docs | test | chore | perf | ci
Example: fix(swap): surface slippage errors in the user's language
-->

## What changes

<!-- What does this PR do, and why? Link the issue if one exists. -->

## What was NOT touched

<!-- Adjacent things you deliberately left alone. Helps reviewers scope. -->

## Checklist

- [ ] `pnpm turbo run typecheck lint test` passes locally (zero warnings)
- [ ] `pnpm check:i18n` passes (every user-facing string exists in `en` and `es`)
- [ ] No seed phrases, private keys, or passwords anywhere — including tests
- [ ] Touches `packages/shared/src/crypto`, `storage`, or `blockchain` signing? → discussed in an issue first (see CONTRIBUTING.md)
