# AGENTS.md instructions for `apps/web/.playwright`

> Companion to `README.md`. README explains _what_ exists and _how to run it_.
> This file documents conventions and decision rules for extending the suite.
> The canonical pattern is `apps/extension/.playwright/AGENTS.md`; this file
> only records the web-specific differences.

## Mental model

`@playwright/test` against the web app served by the Vite dev server. The
config's `webServer` block starts `pnpm --filter @salmon/web dev` (or reuses a
running one) and sets `baseURL`, so specs use `page.goto('/')`. There is no
extension and no persistent profile.

## Selector contract

Identical to the extension suite: select by the shared **`data-testid`
contract** first (`Testable` in `packages/shared`, surfaced as `testID`; see
the `e2e-test-labels` skill), then `getByRole`, then text. CSS / positional
selectors are never the primary anchor. Label unlabeled screens at the
component level rather than writing fragile selectors.

## Conventions

- New specs go in `tests/*.spec.ts`; import `{ test, expect }` from
  `@playwright/test`.
- Gate backend-dependent specs with `test.skip(!backendUp, ...)` using
  `isBackendUp()` from `../env` (repo policy: skip when the backend is down,
  fail when it is up but wrong).
- Keep the suite serial (config enforces `workers: 1`).
- Secrets only in `.env.test` (gitignored), loaded by `env.ts`.

## Pre-flight

New specs that spend the test wallet's SOL or tokens must check the
prerequisite before touching the UI — balance/NFT state via a quick RPC
query, not an assumption. Missing prerequisite → `test.skip(..., reason)`
with a message that says what was missing. Backend reachable but wrong
behavior → the spec must fail, never skip (same rule that already gates on
`isBackendUp()`).

## Auth / wallet state (the open item)

A fresh browser context has no wallet, so the app lands on onboarding, not the
lock screen. To exercise unlock/transaction flows:

1. Run the recover flow once (needs a seed secret in `.env.test`) and save
   `storageState` to a gitignored file.
2. Reuse it via `test.use({ storageState })` so specs start authenticated.

Until then, keep specs to boot-level smokes that assert the shell renders and
the `data-testid` contract holds where applicable (`smoke.spec.ts`).
