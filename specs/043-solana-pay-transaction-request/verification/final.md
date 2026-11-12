# Final checks — spec 043, after the change

The owner's "after" half (spec §Clarifications: "testea antes y después para ver que no se haya roto nada"). Same suite and inventory as `baseline.md`, run on the finished branch and compared test by test.

- HEAD: `65835331e9849b0dd8307d15f4c9e97e796f187b` (US1–US5, the coverage ratchet and the changelog on top of the baseline)
- Node: `v24.21.0`
- Date: 2026-11-12

## Gates

| Command                                                                                                                                                                    | Exit                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/extension --filter=@salmon/mobile --force` (first run, see "Flake" below) | 1 (12/13 tasks; `@salmon/ui#test`: 629/629 passed, 1 unhandled error)   |
| Same command, second run                                                                                                                                                   | 0 (13/13 tasks)                                                         |
| `node scripts/check-i18n.mjs`                                                                                                                                              | 0 (1028 en / 1028 es keys, 0 orphans)                                   |
| `node scripts/check-dom-parity.mjs`                                                                                                                                        | 0 (106 twin pairs, 0 findings; `CROSS_PLATFORM_CLONE_LINES_MAX` = 2513) |
| `pnpm -s check:no-secrets`                                                                                                                                                 | 0                                                                       |
| `npx prettier --check .`                                                                                                                                                   | 0                                                                       |
| `node scripts/check-e2e-selectors.mjs`                                                                                                                                     | 0 (0 findings)                                                          |
| `pnpm --filter @salmon/extension build && pnpm check:manifest`                                                                                                             | 0 ("permissions match the baseline")                                    |
| `pnpm test:coverage --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/mobile`                                                                                   | 0 (floors raised in T060)                                               |

### Flake in the first turbo run

`@salmon/ui#test` passed all 629 tests but Vitest reported one unhandled error, `ReferenceError: window is not defined` from React's scheduler, attributed to `packages/ui/src/components/DAppApproval/DAppTransactionApprovalView.test.tsx`: React work queued by that file ran after its jsdom environment was torn down. Neither that test nor the component it renders changed since `7894953d`. The file alone passed 5 of 5 runs with no error, and the full forced turbo run passed 13/13 the second time, so it is a teardown race under the load of four packages testing in parallel, not a regression.

## Tests per package, before → after

| Package                      | Test files (before → after)                   | Passed      | Skipped | Failed |
| ---------------------------- | --------------------------------------------- | ----------- | ------- | ------ |
| `@salmon/shared` (Vitest)    | 227 + 3 skipped (230) → 237 + 3 skipped (240) | 3283 → 3426 | 14 → 14 | 0 → 0  |
| `@salmon/ui` (Vitest)        | 118 → 120                                     | 612 → 629   | 0 → 0   | 0 → 0  |
| `@salmon/extension` (Vitest) | 17 → 17                                       | 210 → 210   | 0 → 0   | 0 → 0  |
| `@salmon/mobile` (Jest)      | 127 → 130 suites                              | 925 → 947   | 0 → 0   | 0 → 0  |

Per-test inventory, produced exactly as in `baseline.md`: `final-tests-shared.txt`, `final-tests-ui.txt`, `final-tests-extension.txt`, `final-tests-mobile.txt`.

## Comparison

(a) Every gate is green (the one red run is the flake above, green on rerun).

(b) Every line of each `baseline-tests-*.txt` is in the matching `final-tests-*.txt` with the same status, counted with duplicates (a few test names repeat inside one file): 0 missing, 0 renamed, 0 changed status in all four packages. New lines: shared 143, ui 17, extension 0, mobile 22, all from new test files or new cases added to existing files. The one intended change to a passing assertion is T007's: `scan-payload.test.ts › classifyScanPayload refuses a request it cannot read, naming the part` now expects `{ kind: 'transactionRequest', link }` for an `https:` link, keeps its name and passes.

Other pre-existing test files the feature touched only add cases; none edits an existing assertion: `transfer-request.test.ts`, `powerups/boundary.test.ts`, both `QRScanner`/`TransactionConfirmation` tests, and both `ConfirmationHost.test.tsx`, whose stand-in for the confirmation screen also receives the requester, hold and disabled-confirm props for the new forwarding case.

(c) `git diff --exit-code 7894953d -- <the 19 frozen files of baseline.md>` exits 0 (empty), and every test in those 19 files is in the final inventory as `passed`.

(d) Counts per package: the table above.

## Not run here

The device and devnet checks (quickstart §2 Kora mode, §3 steps 1–7, SC-002 timing, SC-006) are run by the owner and recorded in this file when done.
