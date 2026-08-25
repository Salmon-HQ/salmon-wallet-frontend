# Feature Specification: A wallet that can only watch — import by public key

**Feature Branch**: `lucamazza02/dev-10-importar-watcher-wallet-usando-una-public-key` (not yet created)

**Created**: 2026-08-25

**Status**: Draft — audit complete, no code written

**Input**: Linear [DEV-10 — *Importar Watcher Wallet usando una public key*](https://linear.app/salmon-wallet/issue/DEV-10/importar-watcher-wallet-usando-una-public-key). The ticket's own words set the bar: *"No alcanza con deshabilitar los botones visualmente: la lógica interna también debe impedir que una Watcher Wallet llegue a cualquier flujo de firma o ejecución de transacciones."*

This spec is the product of a source-level audit of every signing entrypoint, every dApp method, every account-list surface and the whole persistence path, across `packages/shared`, `packages/ui`, `apps/mobile`, `apps/web` and `apps/extension`. Every claim below carries a `file:line`. Anything not proven from source is marked **INFERRED** or listed under Open questions.

---

## 0. Ticket bookkeeping — the numbers were crossed

Before scoping: **DEV-7 (import via private key) is already done and merged into `main`.** Commit `16188406` *"feat(accounts): import a wallet from its Solana private key"* (34 files, +1429/−154), plus `890d2c5b` and `08a94a66`, merged by `f3581562` from branch `feat/import-private-key`. It shipped `packages/shared/src/crypto/private-key.ts`, `hooks/useImportPrivateKey.ts`, `factories/account-factory.ts:133` (`importAccountFromPrivateKey`), the UI step in both `AccountAddPanel` twins, tests, and `wallet.import.*` copy in `en` and `es`.

**DEV-10 (watcher wallet) does not exist in the codebase.** A repo-wide sweep for `watch-only|watchOnly|view-only|viewOnly|watcher|canSign|hasPrivateKey` outside `node_modules` returns three false positives and nothing else: a prose comment at `packages/shared/src/contexts/BridgeSettlementContext.tsx:78`, the TypeScript modifier at `packages/shared/src/blockchain/ethereum/EthereumAccount.ts:90`, and the words "Review only" in a Playwright comment. `AccountSecret` has exactly two variants (`packages/shared/src/types/account.ts:58-70`).

So this spec covers DEV-10, and DEV-7 needs only its ticket closed — plus the small follow-ups in §9.

Process note, not scope: `f3581562` reached `main` through a local merge, with no PR and no CI run — the same debt as `ad63c37f`. Both want a green Actions run before any build is cut.

## 1. The problem, stated structurally

Every account in Salmon owns key material. That is not a convention — it is the type:

```ts
// packages/shared/src/types/account.ts:58
export type AccountSecret =
  | { kind: 'mnemonic'; mnemonic: string }
  | { kind: 'privateKey'; privateKey: string; networkId: string };
```

`Account extends StoredAccount` and carries `secret: AccountSecret` unconditionally (`types/account.ts:75-81`). Downstream, `SolanaAccount` requires a `SolanaSigningKey` — a raw seed plus a kit signer — to be constructed at all (`packages/shared/src/blockchain/solana/SolanaAccount.ts:55-60`, fields at `:117` and `:123`, assigned `:149-150`). There are exactly **two** construction sites, `blockchain/solana/factory.ts:114` and `factory.ts:180`, and both demand that key.

There is, today, **no path to a `SolanaAccount` without key material**. That is the fact this feature has to change, and it is also the fact that makes it safely changeable: because signing is not scattered across ad-hoc calls but funnels through one object's fields, the codebase can be made to refuse a watcher *at compile time* rather than by discipline.

### Where key material is actually touched — the complete list

Nine sites, all reading `signer` or `seed` off a `SolanaAccount`:

| # | Site | Reached by |
| - | ---- | ---------- |
| 1 | `blockchain/solana/transfer.ts:359` `signTransactionMessageWithSigners`, broadcast `:371` | Send (3 apps), **Bridge deposit** |
| 2 | `blockchain/solana/swap.ts:244` `partiallySignTransaction([signer.keyPair, …])` | Swap |
| 3 | `blockchain/solana/prepared-transactions.ts:172`, broadcast `:177-182` | NFT send, NFT burn |
| 4 | `utils/dapp-approval.ts:87` `signApprovedMessage` | dApp `signTransaction`, `signAllTransactions`, `signAndSendTransaction` |
| 5 | `utils/dapp-approval.ts:485` + broadcast `:486`, `:493` | dApp `signAndSendTransaction` |
| 6 | `utils/dapp-approval.ts:325` `signBytes(account.signer.keyPair.privateKey, …)` | dApp `sign` |
| 7 | `blockchain/solana/offchain-message.ts:81` `signBytes` | dApp `signOffchain` (OCMS v1) |
| 8 | `blockchain/solana/sign-in.ts:232` `signBytes` | dApp `signIn` (SIWS) |
| 9 | `SolanaAccount.ts:163` `retrieveSecurePrivateKey()` | Export-key panels — not a signature, but key exfiltration |

Instance wrappers on top: `SolanaAccount.transfer()` (`:462`, passes `this.signer` at `:470`) and `SolanaAccount.estimateTransferFee()` (`:488`, `:496` — builds a real message, so it throws on a signer-less account even though it broadcasts nothing).

Caller layer: `useSendTransaction.ts:190` (`account.transfer`), `useSwap.ts:221-226` (`account.signer`), `useNftTransfer.ts:91`, `useNftBurn.ts:68`, `utils/account.ts:365` (`retrieveSecurePrivateKey`).

**Bridge has no signing path of its own.** `useBridge.ts:163` only creates the StealthEX exchange; the deposit is an ordinary transfer — `apps/mobile/app/(app)/(tabs)/swap.tsx:356`, `apps/web/src/pages/home/SwapTab.tsx:299`, `apps/extension/src/pages/swap/SwapPage.tsx:322`. Blocking `transfer` blocks bridge for free.

### Two things the ticket asks for that do not exist to be disabled

- **Powerups and Stake are roadmap, not code.** `PRODUCT.md:83-95`, `DESIGN.md:170`. `stake` appears only as a transaction-history classifier (`packages/shared/src/types/transaction.ts:15`). Nothing to gate.
- **Mobile has no dApp signing surface at all** — only a revoke list for trusted apps (`apps/mobile/src/components/TrustedAppsSelector/TrustedAppsSelector.tsx`). The dApp surface is web + extension only.

## 2. The dApp surface, and why a UI gate is not enough

Eight wire methods, allow-listed at `apps/extension/src/entrypoints/background.ts:318-325`:

| Method | Injected provider | Approval view → signing site |
| ------ | ----------------- | ---------------------------- |
| `connect` | `src/lib/SolanaProvider.ts:364` | `handleConnect` `background.ts:228` |
| `disconnect` | `SolanaProvider.ts:380` | — |
| `sign` | `SolanaProvider.ts:557` | `DAppSignMessageApprovalPage.tsx:86` → `dapp-approval.ts:325` |
| `signOffchain` | `SolanaProvider.ts:585` | same page `:81-85` → `offchain-message.ts:81` |
| `signIn` | `SolanaProvider.ts:612` | `DAppSignInApprovalPage.tsx:75` → `sign-in.ts:232` |
| `signTransaction` | `SolanaProvider.ts:422,472` | `DAppTransactionApprovalPage.tsx:68` → `dapp-approval.ts:87` |
| `signAllTransactions` | `SolanaProvider.ts:443,503` | same page, loop `:441-450` |
| `signAndSendTransaction` | `SolanaProvider.ts:402,537` | same page → `dapp-approval.ts:485` |

Wallet Standard advertises the same set at `apps/extension/src/wallet-standard/wallet.ts:131-170`.

Two properties of this surface decide the design:

1. **The background cannot sign.** It has zero `@salmon/shared` imports (`background.ts:4-6`), holds no account object, and routes every approval method through `launchPopupWindow` unconditionally (`background.ts:142-188`). Good — there is no headless signing path to close.
2. **But the account is resolved in exactly one function**, for all eight methods, on both platforms: `getActiveSolanaApprovalAccount` (`packages/shared/src/utils/account.ts:309-344`), called from `apps/extension/src/entrypoints/popup/App.tsx:86` and from `apps/web/src/pages/dapp/{Connect,SignTransaction,SignMessage,SignIn}ApprovalPage.tsx:35/41/44/40`.

Note also that **silent connect exists**: `getConnection` (`background.ts:212-223`) answers a trusted origin from cache with no UI. Connect exposes only an address, which is harmless for a watcher — but it proves the point that the refusal must sit below the UI, not in it.

## 3. What we build

### 3.1 The model — a third `AccountSecret` variant, with a real vault row

```ts
| { kind: 'watchOnly'; address: string; networkId: string }
```

A watcher has no secret, so putting it in a type named `AccountSecret` reads oddly. Do it anyway, and do **not** take the tempting shortcut of leaving the vault row absent — the audit found the trap:

> `toAccountSecret(undefined)` returns `{ kind: 'mnemonic', mnemonic: '' }` (`packages/shared/src/utils/account-secret.ts:29-31`).

An account with no vault row is therefore restored as a *mnemonic* account with an empty phrase, and hits the derivation branch of `restoreAccount` (`hooks/useAccounts.ts:191-235`) on every single unlock. The watcher must carry an explicit tagged row. Both `toStoredSecret` (`account-secret.ts:39`) and `toAccountSecret` (`:28`) need the new branch; `buildSecretVault` (`:44-49`) maps every account through the former.

Consequence to accept, not fight: `addAccount` re-encrypts the whole vault before admitting anything (`hooks/useAccountsMutations.ts:88-105`) and `removeAccount` does the same (`:172-177`), both throwing `EncryptionMaterialMissingError` (`crypto/encrypt-mnemonics.ts:100`) without live key material. **Importing or deleting a watcher will still require the password or a live cached key.** That is correct — the vault is one blob — and the existing `reauth` step in `AccountAddPanel` already handles it, guarded by `isVaultKeyCached()` (`crypto/encrypt-mnemonics.ts:113`) checked *before* the work, per `890d2c5b`.

### 3.2 The enforcement — a class that cannot sign, not a boolean

Add `WatchOnlySolanaAccount` and put it in the `BlockchainAccount` union (`packages/shared/src/types/blockchain.ts:32`). It exposes the read surface only — `getRpc`, `getRpcSubscriptions`, `getBalance`, `getCredit`, `getRecentTransactions`, `getAllNfts`, `getReceiveAddress`, `getPublicKey`, `getNetworkId`, `getDomain*`, `validateDestinationAccount`, `requiresMemo`, `calculateTransferFee`, `disconnect` — and omits `signer`, `seed`, `retrieveSecurePrivateKey` (`SolanaAccount.ts:163`), `transfer` (`:462`) and `estimateTransferFee` (`:488`).

**The union membership is the whole point.** Adding it turns `tsc` into the acceptance checklist: every one of the nine signing sites and five hooks in §1 stops compiling until it narrows the type. A boolean `account.watchOnly` buys none of that — it would have to be remembered at 9 signing sites × ~35 UI surfaces, and the first forgotten check is a silent fund-moving bug in a wallet. The ticket's "no alcanza con deshabilitar los botones" is, precisely, a request for the type-level version.

Two runtime guards the type system will **not** catch:

- **`isSolanaAccount` duck-types on `'getRpc' in account`** (`utils/account.ts:54-58`, `:77`). A watcher needs `getRpc` to read balances, so it passes the predicate and reaches `approveSolana*`, where it dies on `reading 'keyPair' of undefined` instead of refusing cleanly. Tighten to an explicit discriminator (or `'signer' in account`).
- **`getActiveSolanaApprovalAccount` must return `null` for a watcher** (`utils/account.ts:309-344`). One edit fails all eight dApp methods closed on both platforms. Careful with its fallback at `:336-340`: it walks past the active account to *another* Solana account, so returning `null` — not falling through — is the required behavior. A watcher must never have a dApp request answered by a different, signable account.

### 3.3 The import flow

A fourth `MethodCard` in the in-app add panel, beside the three that exist (`packages/ui/src/components/AccountAddPanel/AccountAddPanel.tsx:398-462`; mobile twin `apps/mobile/src/components/AccountPanels/AccountAddPanel/AccountAddPanel.tsx:357-412`). New step in `AccountAddStep` (`packages/shared/src/types/ui/account-add.ts`).

**Not in onboarding.** `SelectOptionsPage` reserves exactly one secondary slot and a third button overflows the grid (constraint documented at `packages/ui/src/components/AuthFlow/SelectOptionsPage.tsx:10-13`, and the whole reason spec `013-onboarding-layout` exists). A watcher as a first wallet is a design decision, not a button — see Open questions.

Validation follows the shape `parseSolanaPrivateKey` established (`packages/shared/src/crypto/private-key.ts:30-35`): return **i18n key literals**, never messages, never the input. For a public key the checks are base58 decode → 32 bytes → on the ed25519 curve. Reuse the duplicate-address rejection already in `useImportPrivateKey.ts:53` (`collectSolanaAddresses`); a watcher address must join that set, and importing a watcher for an address the user already holds the key to must be refused.

The field is **not** secret — a public key is public. Use the ordinary text input, not `PasswordInput`, and skip the warning notice that the private-key flow carries. Show the resolved address for confirmation, as `useImportPrivateKey` does.

### 3.4 The badge

Four list components render the name+address block where a `Watcher` chip goes: `packages/ui/src/components/AccountsPanel/AccountsPanel.tsx:190-212`, `WalletSwitcherSheet/WalletSwitcherSheet.tsx:199`, `apps/mobile/src/components/AccountPanels/AccountsPanel/AccountsPanel.tsx:89-99`, `apps/mobile/src/components/WalletSwitcherSheet/WalletSwitcherSheet.tsx`. Plus the header, so the active-wallet state is legible without opening a sheet (`packages/ui/.../WalletHeader.tsx:233-262`, `apps/mobile/.../HeaderContent.tsx:112-115`).

Design tokens only — `packages/shared/src/theme` is the single source (AGENTS.md). No hardcoded color.

## 4. Acceptance checklist — the surfaces that must refuse

Derived from the audit; each line is verifiable at the cited site.

### Must be disabled or hidden

| Surface | Sites |
| ------- | ----- |
| Send (quick action) | `packages/ui/src/components/ActionButtonRow/ActionButtonRow.tsx:169` — **a `sendDisabled` prop already exists at `:140` and is unused**; mobile `apps/mobile/src/components/ActionButtonRow/ActionButtonRow.tsx:89`, prop `:61`. Feed it from `apps/web/src/pages/home/HomePage.tsx:969`, `apps/extension/src/pages/home/HomePage.tsx:1436`, `apps/mobile/app/(app)/(tabs)/index.tsx:751` |
| Send (flows) | `apps/web/src/router.tsx:165`, `SendRoute.tsx:107`; `apps/extension/.../HomePage.tsx:1333`; `packages/ui/.../SendPage/StepConfirmation.tsx:257`; mobile `index.tsx:1011`, `SendSheet/StepAddressAmount.tsx:437`, `StepConfirmation.tsx:178` |
| Swap + Bridge (one tab) | tabs `apps/web/.../HomePage.tsx:942`, `apps/extension/.../HomePage.tsx:1406`, mobile `_layout.tsx:905` (`href: null` precedent already used at `:908`); screens `SwapTab.tsx:316,323`, `SwapPage.tsx:352,359`, `swap.tsx:161,319,369`; controls `SwapTabSelector.tsx:35,57`, `SwapInputScreen.tsx:156`, `SwapReviewButtons.tsx:51`, `BridgeReviewScreen.tsx:125` |
| NFT send / burn | `packages/ui/.../NftDetailPage.tsx:589,623,564`; wired `NftDetailRoute.tsx:193`, `apps/extension/.../HomePage.tsx:1277,1290`; mobile `NftDetailSheet.tsx:535,570,655,745,870` |
| dApp approve (web+ext) | `DAppConnectApprovalView.tsx:113`, `DAppTransactionApprovalView.tsx:189,199`, `DAppSignMessageApprovalView.tsx:193`, `DAppSignInApprovalView.tsx:314` (has a `canApprove` lever), `HoldToApproveButton.tsx:127`; routes `apps/web/src/router.tsx:95,102,109,116`, `apps/extension/.../popup/App.tsx:523,532,544,562` |
| Export private key / show phrase | menus `SettingsPanelStack.tsx:105,106` (dispatch `:357-361`), mobile `SettingsSheet.tsx:109,110` (`:208-211`); rows `AccountEditPanel.tsx:118,124,177` and mobile `:67,73,88-90`. Precedent for the empty state: `BackupPanel.tsx:109` (`backup-no-seed-phrase`) |
| Derive new account | `DerivedAccountsPage.tsx:120,182`, `apps/mobile/app/(auth)/derived-accounts.tsx:109,173` — already gated on `getAccountMnemonic()` returning null (`DerivedAccountsPage.tsx:102`, `derived-accounts.tsx:92`) but see §9 |

### Must keep working

Receive sheets and copy-address (`WalletHeader.tsx:220`, `HeaderContent.tsx:178`); balances (`useBalance`), tokens (`useMultiChainTokens.ts:125-137`), NFTs (`useSolanaNfts`, `useAvatarNfts.ts:57`), activity (`useTransactions.ts:122,132`); rename (`AccountNamePanel.tsx:73,112` → `editAccount`, key-free); switch (`useAccountsSelection.ts:57` `changeAccount`, key-free); delete (`useAccountsMutations.ts:163` `removeAccount`, the single sink for every delete trigger across all apps); explorer, currency, language, address book.

Read paths need no change: `useAccountsSelection.ts:54,106,142`, `usePrefetchBalances.ts:61-62`, `useSendContacts.ts:88`, `useAccountsConnection.ts:25`, `utils/account.ts:264,288`, and every app-level address reader all call polymorphic read methods only.

### Will break unless narrowed

`utils/account.ts:365` (`getAccountKeysForNetwork` → `retrieveSecurePrivateKey` on every non-null entry, consumed by both `PrivateKeyPanel` twins); `utils/account.ts:309-344`; `useSwap.ts:223`; `useSendTransaction.ts:190`; `useNftTransfer.ts:91-93`; `useNftBurn.ts:68`; `utils/legacy-migration.ts:260`; `useAccountsMutations.ts:143-153` (`editAccount` merging derived accounts — a watcher has nothing to derive).

## 5. Tests

Per AGENTS.md: functional coverage in the owning package first, E2E last.

**`packages/shared` (Vitest), the load-bearing ones:**

- The watcher round-trips the vault: import → `buildSecretVault` → `encryptMnemonics` → reload → `restoreAccount` yields a watcher, **not** a mnemonic account with an empty phrase. This is the §3.1 trap, and it deserves the same treatment as `private-key.test.ts:108`.
- `getActiveSolanaApprovalAccount` returns `null` for a watcher **and does not fall through to another account** (`utils/account.ts:336-340`).
- `isSolanaAccount` rejects a watcher.
- Public-key validation rejects: non-base58, wrong length, off-curve, an address already held, and never echoes the input — mirroring `private-key.test.ts:124`.
- `removeAccount` deletes a watcher and leaves the remaining vault decryptable.

**`packages/ui` / `apps/mobile`:** the badge renders for a watcher and not for others; Send/Swap/NFT actions render disabled; the add-panel step validates and shows the resolved address.

**E2E:** one flow per suite at most, and only after the unit layer is green. `apps/extension/.playwright/` is the interesting one — a watcher connected to a dApp must have `signTransaction` refused.

## 6. i18n

New namespace `wallet.watcher.*` in `packages/shared/src/locales/{en,es}/translation.json`, plus `settings.account_add.import_watcher` / `_description` to match the existing card copy. Convention, from the audit: lowercase dot-path `domain.screen.item`, errors under `<domain>.errors.<reason>` where the leaf name equals the discriminated-union reason.

Keys needed: card title + description, step title, field label/placeholder/help, `resolved_address`, the badge label, the disabled-action tooltip, and `errors.{empty,format,offCurve,duplicate}`.

Never guess a Spanish translation — look for precedent first (`i18n-authoring` skill). Run `node scripts/check-i18n.mjs`.

## 7. Ownership and placement

Follows the DEV-7 diff exactly, which is the precedent to copy — those commits touched, and this one will touch, the same seams:

| Package | Files |
| ------- | ----- |
| `packages/shared` | `types/account.ts`, `types/blockchain.ts`, `types/ui/account-add.ts`, `blockchain/solana/{WatchOnlySolanaAccount.ts,factory.ts}`, `factories/account-factory.ts`, `utils/{account.ts,account-secret.ts}`, `hooks/{useAccounts.ts,useAccountsMutations.ts,useAccountsLoader.ts}`, a new `hooks/useImportWatcher.ts`, `crypto/public-key.ts`, both locales |
| `packages/ui` | `AccountAddPanel`, `AccountsPanel`, `WalletSwitcherSheet`, `WalletHeader`, `ActionButtonRow`, `NftDetailPage`, the four `DAppApproval` views |
| `apps/mobile` | the hand-mirrored twins of each of the above — there is no shared render between DOM and RN |
| `apps/web` / `apps/extension` | wiring only: pass the new disabled state into `ActionButtonRow`, hide the swap tab |

Verification: `pnpm turbo run typecheck lint test --filter=@salmon/shared` then `@salmon/ui`, `@salmon/mobile`, `@salmon/web`, `@salmon/extension`.

## 8. Out of scope

- Powerups and Stake gating — neither exists (§1).
- Bitcoin and Ethereum watchers. `createBlockchainAccountFromPrivateKey` already refuses non-Solana (`utils/account.ts:208-210`); a watcher follows the same single-network shape. **INFERRED**, but consistent with the whole import path being pinned to `IMPORT_NETWORK_ID = 'solana-mainnet'` (`useImportPrivateKey.ts:17`).
- A watcher as the *first* wallet in onboarding — see Open questions.
- Converting a watcher into a full wallet by later supplying its key.

## 9. Adjacent findings — separate tickets, not this one

1. **`isImportedAccount` has no consumer.** Written, tested and exported (`utils/account-secret.ts:65`, `utils/index.ts:47`), referenced by zero UI files. Meanwhile `handleSelectDerive` returns silently when the active account has no mnemonic (`packages/ui/.../AccountAddPanel.tsx:187-189`, mobile `:170`) — so with an imported account active, tapping "Create New Account" is a **silent no-op** instead of a hidden or disabled card. The predicate looks written for exactly this gate and never wired in. Watcher work will want the same gate, so fixing it first is cheap.
2. **Clipboard is never cleared.** `grep` for `setStringAsync('')` / `writeText('')` / `clearClipboard` returns nothing. The private-key import is a paste, and `PrivateKeyPanel.tsx:166` writes keys *to* the clipboard on export with no timed clear. Highest-value open item from the DEV-7 security pass.
3. **`lockAccounts` does not clear the accounts array.** `useAccountsSecurity.ts:109-112` drops the derived key but leaves every `secret.privateKey` string and every `SolanaAccount.seed` resident; only `clearAccounts` empties it (`useAccountsMutations.ts:65`). Predates DEV-7 and applies to mnemonics equally, but a raw imported key is a worse thing to leave in memory.
4. **A private key pasted into the re-auth password field** is fed to PBKDF2 as a password and nothing notices. The two fields are visually identical `PasswordInput`s one step apart in the same panel.
5. **Silent connect is dead in shipped builds.** `background.ts:216` compares `connection?.blockchain !== 'solana'` lowercase; the only production writer stores it uppercased (`useAccountsConnection.ts:23` `blockchainType.toUpperCase()`). `apps/extension/src/background.test.ts:127` passes only because it seeds lowercase. Unrelated to this ticket, real bug.
6. **`salmon_pending_approval` is dead code.** `popup/App.tsx:179-241` reads a session-storage queue nothing writes; approvals arrive via the popup URL hash (`background.ts:147-156`).

## 10. Decisions taken

Resolved with the product owner on 2026-08-25, before any code was written:

1. **Naming: "Watch-only"** (es: "Sólo lectura"). Matches what Phantom and Solflare call it, so the term is already familiar to a crypto user, and it names the capability rather than the object. i18n namespace: `wallet.watchOnly.*`, plus `settings.account_add.import_watch_only`.
2. **In-app only.** A fourth `MethodCard` in `AccountAddPanel`, beside the three that exist. Onboarding is untouched, which sidesteps the one-secondary-slot grid constraint from spec `013` (`SelectOptionsPage.tsx:10-13`). A watch-only wallet as a *first* wallet stays out of scope.
3. **`canDelete` keeps its current rule** — "more than one account exists" (`AccountsPanel.tsx:114`, mobile `:156`, `WalletSwitcherSheet.tsx:199`). No watch-only exception. Consequence to accept knowingly: a user whose only remaining wallet is watch-only cannot transact and cannot delete it. No funds are at risk — there are no keys — but the state is a dead end short of reinstalling.
4. **The third `AccountSecret` variant stays inside `AccountSecret`** (§3.1). The vault stays uniform, the diff stays small, and the absent-row trap makes an explicit tagged row mandatory regardless. A rename would ripple through three apps for no behavior change.
5. **Importing a watch-only wallet still asks for the password** when the vault key is not cached (§3.1), because `addAccount` re-encrypts the whole vault before admitting anything. The existing `reauth` step covers it. No special-case write path around `addAccount`.
