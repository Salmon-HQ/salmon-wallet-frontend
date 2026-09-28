<!--
Title must be a Conventional Commit (CI checks it):
  feat | fix | refactor | docs | test | chore | perf | ci
Example: fix(send): surface network errors in the user's language
-->

## What changes

<!-- What does this PR do, and why? Link the issue if one exists. -->

## What was NOT touched

<!-- Adjacent things you deliberately left alone. Helps reviewers scope. -->

## Checklist

- [ ] `pnpm turbo run typecheck lint test:coverage` passes locally (zero warnings)
- [ ] `pnpm check:i18n` passes (every user-facing string exists in `en` and `es`)
- [ ] No seed phrases, private keys, or passwords anywhere — including tests
- [ ] Touches `packages/shared/src/crypto`, `storage`, or `blockchain` signing? → discussed in an issue first (see CONTRIBUTING.md)

<!-- Delete this section unless the PR touches `powerups/**`. -->

## Powerup PR

The full reviewer checklist is `docs/POWERUPS-UI.md` §3 — eleven lines, applied
in order, any "no" blocks. The gates that are easiest to miss:

- [ ] `pnpm check:parity` green, no new `MOBILE_ONLY` / `DOM_ONLY` entry, and the clone ceiling did not rise
- [ ] Every visible element is a §1 block or a folder-local composition of them — no custom modal, spinner, icon asset, literal spacing, duration or easing
- [ ] Loading, empty and error all have a screen; a builder also covers every `describePowerupBuildError` outcome
- [ ] Transaction bytes come only from `/v1/{networkId}/powerups/{id}/build`, and `requestSignature` is the one door — no confirmation, wait or receipt drawn by the Powerup
- [ ] The manifest is honest: `permissions` matches what leaves the device, `endpoints` matches every network call in the folder, `iconName` is a glyph both twins draw
- [ ] `pnpm check:powerups-bundle <dist>` proves the Powerup absent from a Powerups-off build
