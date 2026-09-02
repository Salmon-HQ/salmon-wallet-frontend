# Feature Specification: Derived accounts import themselves, and Wallets shows where they come from

**Feature Branch**: `feat/redesign-mobile-home` (spec dir `024-derived-accounts-auto-import`)
**Created**: 2026-09-02 · **Status**: Superseded by 025 (model)

## Owner rulings (2026-09-02)

1. **No detour, no question.** The onboarding's "Check derivables" screen is gone (spec 022 cleanup). Derived accounts are found and imported on their own.
2. **All of them.** Every derived account the BIP-44 gap scan finds (gap 20, per network, mirrors for devnet/sepolia as the old screen did) is imported — not only index 1, not only the ones with a balance.
3. **They are seen in Wallets, under their parent.** The wallet switcher shows a wallet's derived accounts nested under the parent's card, visibly descending from it; tapping one activates it.
4. **A manual rescan exists** in Wallets, for a seed that gains accounts later.
5. **Home keeps the short address** in the header; nothing changes there.

## Security bound (approved)

No new handling of key material. While the wallet is unlocked the active account already carries its mnemonic in memory (`getAccountMnemonic(account)` in `packages/shared/src/utils/account-secret.ts`), and importing derived accounts is `accountActions.editAccount(id, { newDerivedAccounts })` — no password, exactly what the retired screen and `AccountAddPanel` do today. The scan runs only while unlocked, never persists or logs the mnemonic, is cancelled on lock, and touches nothing under `packages/shared/src/crypto` or `storage` beyond one new `UserConfig` field.

## Placement

- **`packages/shared`**: the logic — `useDerivedAccountsAutoImport()` hook (or a plain async function + hook pair) that decides _which_ wallet needs a scan, runs it, imports the result, and records completion; `UserConfig.derivedScannedAccountIds?: string[]` (absent = nothing scanned, the same "store only exceptions" idiom `excludedFromTotal` uses) with `markDerivedScanned(id)` on `useUserConfig`; types for the scan status. Vitest coverage.
- **`apps/mobile`**: wiring in `app/(app)/_layout.tsx` (a small provider next to `TaskChromeProvider`, exposing `{ status, rescan(accountId) }`), the nested rows in `wallets.tsx`, the rescan action. Jest coverage.
- Web/extension: out of scope; they keep reading the shared contracts they already read.

## The automatic scan

- **When**: on the first unlocked Home mount after a mnemonic wallet is created or recovered — concretely, whenever the app is unlocked and the active account is a mnemonic account whose id is not in `derivedScannedAccountIds`. Watch-only and private-key accounts are never scanned (nothing to derive) and are marked scanned so the check is cheap.
- **How**: `getScanNetworks()` → `scanDerivedAccounts(mnemonic, networkIds)` → for each found account, plus its mirror network account when the parent has that network (`getMirrorNetworkId` + `deriveBlockchainAccount`, as `derived-accounts.tsx` did before deletion) → one `editAccount(id, { newDerivedAccounts })`. Then `markDerivedScanned(id)`.
- **Failure**: a scan that throws, or reports failed networks, leaves the id unmarked so it runs again next launch; it never marks partial results as done. No error surface on Home — Wallets shows the state (below).
- **Lock**: the scan checks a cancel token; locking cancels and leaves the id unmarked.
- **Concurrency**: one scan at a time; switching the active wallet mid-scan does not start a second one.
- **Analytics**: none — no seed, address or key leaves; the funnel event stays what `AccountAddPanel` sends when a user adds an account by hand.

## Wallets

- The `SubAccountSelector` chips under a wallet card are replaced by **nested rows**: one `ListRow` per derived account, indented one gutter under the parent card, with a vertical descent line in `border.default` from the parent's leading edge (tokens only; hairline width). Label `"{parent name} · {index}"` (e.g. "Account 1 · 2"), subtitle the short address, trailing a check in `accent.ink` on the active one. Tapping: `changeAccount(parent)` if needed, then `changePathIndex(index)` — the same two calls the chips make today.
- Gap 20 between cards stays; 4/8/12 inside the nested block.
- While a scan for that wallet is running, the nested block shows `SkeletonRow` rows (the kit's skeleton, inside the same container as the rows — spec 022's rule).
- **Rescan**: an action "Find derived accounts" in the wallet card's actions (where rename / include-in-total live), enabled for mnemonic wallets, disabled while a scan runs. It calls `rescan(accountId)`; new finds are appended, existing ones untouched.
- Delete `SubAccountSelector` and its test if no other consumer remains (grep first; `NftSectionHeader` mentions it — check whether it renders it or only guards on it).

## Cleanup

- Delete `app/(auth)/derived-accounts.tsx`, its test, its `Stack.Screen`, and `'derived-accounts'` from the root guard list in `app/_layout.tsx`; prune `wallet.derived.*` locale keys that lose their last reader (`node scripts/check-i18n.mjs --prune`; keys still read by `packages/ui`'s DOM flows stay).

## i18n

EN written by the implementer; ES follows the neighbouring keys' voice (voseo) and every ES string is listed for the owner. Needed at least: the rescan action label, the nested-row label pattern, the scanning state's accessibility label.

## Tests

- shared: scans an unmarked mnemonic wallet once and marks it; skips marked, watch-only and key accounts; leaves unmarked on throw / failed networks / cancel; imports mirrors only where the parent has the mirror network; one scan at a time.
- mobile: Wallets renders derived rows nested under the right parent in index order; tapping activates (both calls, in order); active row is marked; skeleton rows while scanning; rescan action calls `rescan(id)` and is disabled while scanning; the auth stack no longer registers `derived-accounts`.

## Verification

`pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/mobile`, then at close `pnpm format:check`, full turbo, `node scripts/check-i18n.mjs`. Owner review on device with a recovered seed that has several derived accounts.
