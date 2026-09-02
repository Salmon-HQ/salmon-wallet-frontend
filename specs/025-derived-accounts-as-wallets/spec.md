# Feature Specification: Derived accounts are wallets of their own, and the user chooses which to import

**Feature Branch**: `feat/redesign-mobile-home` (spec dir `025-derived-accounts-as-wallets`)
**Created**: 2026-09-02 · **Status**: Approved by the owner 2026-09-02, in implementation. **Supersedes spec 024's model** (sub-accounts nested under a parent); its scan, cancellation, once-per-wallet marking and tests are reused.

## Owner rulings (2026-09-02)

1. **The industry model.** A derived path is a wallet of its own — its own card, name, avatar, "include in total" — sharing the seed with the wallet it was derived from. This is what "add account → derive" already does (`createAccount({ mnemonic, startIndex })`), what Phantom / Backpack / MetaMask do, and how users read it: wallets that share a seed, not a wallet with children. No index ever appears in the UI.
2. **Not automatic: the user chooses.** After the scan finds funded paths, the app asks which to import. Nothing is imported silently.
3. **Wallets shows where they come from.** Wallets stay a flat list; the cards of one seed sit together, with a descent line between them and "Derived from {name}" as the derived card's subtitle.
4. **Home keeps the short address.** Nothing changes there.

## The scan and the ask

- **When**: the first unlocked Home after a mnemonic wallet is created or recovered, and on a manual rescan from Wallets. Same trigger, cancel-on-lock, one-at-a-time and never-log rules as spec 024. Watch-only and private-key wallets are never scanned.
- **What counts**: paths with a balance > 0 (per network; mirrors follow their mainnet find), **excluding paths the user already holds as a wallet** (compare addresses against every existing wallet's receive addresses — a path imported through "add account → derive" must not be offered again).
- **Nothing found**: nothing is shown; the wallet is marked scanned.
- **Something found**: `DerivedAccountsSheet` (mobile, `BottomSheetContainer` + `SheetTitle`, one state → sheet) opens over Home: title "We found {{count}} accounts from your phrase", one line "They were created from the same recovery phrase. Choose which to add.", a row per find (`ListRow`: name it will get, short address, balance formatted per network, a checkbox — all checked by default), primary "Import {{count}}", secondary "Not now". Importing creates one wallet per checked row through the same path `AccountAddPanel` uses (`createAccount({ mnemonic: parent's, startIndex: index, name })`, then `accountActions.addAccount`), named "{parent name} {n}"? — no: named like a new account is named today (`defaultName`, e.g. "Account 2"), the user renames later. Either button marks the parent scanned; the sheet never returns for that wallet on its own — only a rescan brings it back.
- Reduce motion, tokens, gap 20 / 4-8-12, i18n EN+ES (ES in the neighbours' voseo, listed for the owner).

## Wallets

- **Revert** spec 024's nested rows, hide/show, `Hidden (n)`, `hiddenDerivedAccounts`, the sub-account sum in `useWalletTotals` (back to one address per wallet: the total sums included wallets, each wallet is one address per network), and the `pathIndex` fallback on card tap. `SubAccountSelector` stays as it was before 024 (`NftSectionHeader` renders it).
- **Grouping**: a derived wallet knows its parent — `StoredAccount.derivedFrom?: string` (parent wallet id), set at import (both by the sheet and by "add account → derive"). Wallets orders cards so a parent is followed by its derived wallets, in index order; between a parent and its derived cards a descent line (`border.default`, hairline) runs along the leading edge, and each derived card shows "Derived from {parent name}" as its subtitle. A parent whose derived wallets were all removed shows nothing extra. Removing a derived wallet is the existing "remove wallet" action.
- **Rescan**: keep 024's action on mnemonic wallet cards; it runs the scan for that wallet and opens the same sheet (or a short "No new accounts" state block inside the sheet when nothing is found).

## Cleanup

- Delete `hiddenDerivedAccounts` / `setDerivedHidden` and their tests; keep `derivedScannedAccountIds` / `markDerivedScanned`.
- Delete the nested-row code and its i18n keys that lose their reader (`--prune`), including the hide/show strings.
- `DerivedAccountsContext` becomes the owner of scan state **and** of the sheet's visibility and its finds.

## Tests

- shared: finds exclude paths already held as wallets; nothing-found marks scanned; import creates wallets via `createAccount` + `addAccount` with `derivedFrom` set; "Not now" marks scanned without importing; cancel/failure leave unmarked; one scan at a time.
- mobile: the sheet lists finds checked, imports the checked ones, "Not now" dismisses; Wallets groups derived cards after their parent with the subtitle; rescan opens the sheet; no index text anywhere.

## Verification

`pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/mobile`, then `pnpm format:check`, full turbo, `node scripts/check-i18n.mjs`. Owner review on device with a recovered seed that has several funded paths.
