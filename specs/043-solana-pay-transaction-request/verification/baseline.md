# Baseline checks — spec 043, before any source change

The owner's "before" half (spec §Clarifications: "testea antes y después para ver que no se haya roto nada"). Recorded on the untouched branch; T068 repeats the same suite and compares.

- HEAD: `7600c2d7c8638d31a51d0f8625878df6975f3821` (`7894953d` plan + `7600c2d7` tasks, no source change)
- Node: `v24.21.0`
- Date: 2026-11-12

## Gates

| Command                                                                                                                                                            | Exit                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/extension --filter=@salmon/mobile` (run with `--force`, no cache) | 0 (13/13 tasks)                                                         |
| `node scripts/check-i18n.mjs`                                                                                                                                      | 0 (999 en / 999 es keys, 0 orphans)                                     |
| `node scripts/check-dom-parity.mjs`                                                                                                                                | 0 (105 twin pairs, 0 findings; `CROSS_PLATFORM_CLONE_LINES_MAX` = 2458) |
| `pnpm -s check:no-secrets`                                                                                                                                         | 0                                                                       |
| `npx prettier --check .`                                                                                                                                           | 0                                                                       |
| `node scripts/check-e2e-selectors.mjs`                                                                                                                             | 0 (0 findings)                                                          |

No gate was red before the change.

## Tests per package

| Package                      | Test files                  | Passed | Skipped | Failed |
| ---------------------------- | --------------------------- | ------ | ------- | ------ |
| `@salmon/shared` (Vitest)    | 227 passed, 3 skipped (230) | 3283   | 14      | 0      |
| `@salmon/ui` (Vitest)        | 118                         | 612    | 0       | 0      |
| `@salmon/extension` (Vitest) | 17                          | 210    | 0       | 0      |
| `@salmon/mobile` (Jest)      | 127 suites                  | 925    | 0       | 0      |

Per-test inventory (`<file> › <full test name> › <status>`, sorted): `baseline-tests-shared.txt`, `baseline-tests-ui.txt`, `baseline-tests-extension.txt`, `baseline-tests-mobile.txt`. Produced with `pnpm --filter <pkg> test --reporter=json --outputFile=…` (mobile: `--json --outputFile=…`); the flags go without a `--` separator, because pnpm forwards a literal `--` and Vitest then ignores the reporter flags.

## Frozen signing test files

These files must stay byte-identical through the feature (`git diff --exit-code 7894953d -- <list>` empty) and keep passing.

| File                                                                             | `git hash-object`                          |
| -------------------------------------------------------------------------------- | ------------------------------------------ |
| `packages/shared/src/utils/dapp-approval.test.ts`                                | `0d6ee3dbcab1a04bfca1d410e68edd9067931ef1` |
| `packages/shared/src/utils/dapp-transaction-display.test.ts`                     | `3c22c15e50f074c4126483f85daa6671d2aa7b3b` |
| `packages/shared/src/blockchain/solana/signing.test.ts`                          | `e4960cce7cff51248e9aaf979716097ba96c52dc` |
| `packages/shared/src/blockchain/solana/solana-transfer.test.ts`                  | `caf9ba24cf999b6d9116b705a20bc2ac6a0bf103` |
| `packages/shared/src/blockchain/solana/prepared-transactions.test.ts`            | `ef3794a9f202f22ccc66d1b72dbbf26579a4acfe` |
| `packages/shared/src/blockchain/solana/prepared-transactions.golden.test.ts`     | `93e95463ad20ca5407ac3a4e5e4bac992515520e` |
| `packages/shared/src/blockchain/solana/prepared-transactions.outcome.test.ts`    | `cecdd06e40a74e89bf7f9f6645c95e60535604bb` |
| `packages/shared/src/blockchain/solana/confirm.test.ts`                          | `afcea3178bfc2f7b90ce37d9bd8d58c5d0e1f475` |
| `packages/shared/src/core/broadcast/solana.test.ts`                              | `d72c0f77b74bd737f08c0eebfdc37b80e8cd2e59` |
| `packages/shared/src/core/broadcast/solana-swap.test.ts`                         | `dcd26a363fcaf52e9ad47dfd4670c4521d5bff67` |
| `packages/shared/src/core/signing/index.test.ts`                                 | `0d78a9712a67e6e562cf67e5a50443f91cf40173` |
| `packages/shared/src/core/confirmation/SignatureRequestContext.test.tsx`         | `b61b8271f065c62b89790d57cc4979410bb4b01e` |
| `packages/shared/src/core/confirmation/SignatureRequestContext.outcome.test.tsx` | `51bfb2f880ff49fba3275c71942b5e9272d6730a` |
| `packages/shared/src/hooks/useSendTransaction.test.tsx`                          | `45b2e5026903ef4255437c2f29fcc0e3a2969b0e` |
| `packages/shared/src/hooks/useNftTransfer.test.tsx`                              | `2faa90aa5b505f0d68c7e4c5628379aad2d491f8` |
| `packages/ui/src/components/SendPage/SendPage.test.tsx`                          | `ed8034728f184558852d9a9f0b05edf9389198e8` |
| `apps/mobile/__tests__/app/send-screens.test.tsx`                                | `80f6bae0cb6636192a1265652d19dd9d15b7cba0` |
| `apps/mobile/src/mwa/MwaRequest.test.tsx`                                        | `79eb18299717a2f1e392146f738aefa1b5b3bbd6` |
| `apps/mobile/src/mwa/MwaRequestDetails.test.tsx`                                 | `7b03277545e984a615cb2c16578b1754b8391749` |
