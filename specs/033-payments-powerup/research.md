# Research: Payments (spec 033)

Sources read for this: `Salmon-HQ/salmon-pay` (`lib/domain.ts`, `lib/payment-service.ts`, `lib/adapters.ts`, `lib/money.ts`, `lib/config.ts`, `ARCHITECTURE.md`), the Solana Pay transfer-request spec (now hosted at `solana-foundation/pay`, `typescript/packages/solana-pay/spec/SPEC.md` and `SPEC1.1.md`), the x402 v2 SVM scheme (`x402-foundation/x402`, `specs/schemes/exact/scheme_exact_svm.md`), and this repo at `feat/powerups-foundations` (`docs/POWERUPS-UI.md`, `DESIGN.md`, `packages/shared/src/powerups/memo/**`, `blockchain/solana/{transfer,networks,signature-status,SolanaReadAccount}.ts`, `hooks/{useInstalledPowerups,useSendFlowState,useSendTransaction,useAmountShortcuts}.ts`, `apps/mobile/src/components/{QRScanner,ReceiveSheet,QRCode}`, `packages/ui/src/components/{SendPage,ReceiveSheet,QRCode}`, `scripts/check-dom-parity.mjs`, `eslint.config.js` powerups block).

## R1. Dependency: hand-written Solana Pay grammar, no `@solana/pay`

- **Decision**: write `parseTransferRequest` / `encodeTransferRequest` (≈120 lines with validation) and the settlement reader in `packages/shared/src/blockchain/solana`; do not add `@solana/pay`.
- **Rationale**: the current `@solana/pay` line (repo v1.2.0) runs on `@solana/kit` ^8.1, which matches our stack, but it pulls a peer set (`@solana/kit-plugin-*`, `@solana/rpc-subscriptions-*`, four `@solana-program/*`) and the npm `latest` tag (1.0.26) does not match the repo, so the pin is uncertain. The grammar is a URL with seven query keys; `findReference` is one RPC call; `validateTransfer` is a balance diff we must adapt to "owner of the token account" anyway (salmon-pay's rule). The runbook forbids a new dependency without a reviewer's sign-off, and the owner reviews this lot.
- **Alternatives considered**: `@solana/pay@0.2.x` (web3.js v1: a second SDK generation, rejected outright); `@solana/pay@1.x` (kept as the fallback if the parser grows past what a reviewer wants to read).

## R2. The grammar and its validation

- **Decision**: implement SPEC.md's transfer request plus SPEC1.1's clarifications: `solana:<recipient>?amount&spl-token&reference (repeatable)&label&message&memo`. Recipient must be a valid base58 address (the standard says a native SOL account; we cannot tell an ATA from an owner without an RPC, so the review shows the address and the transfer's idempotent ATA creation handles the owner case). `amount` is decimal user units, non-negative, no exponent, leading zero required, decimals ≤ token decimals (resolved against the wallet's token list at pay time, not at parse time). A request without `amount` asks the user (FR-021). `reference` values must be base58 32-byte; order preserved. `label`/`message`/`memo` URL-decoded UTF-8; memo bytes ≤ the memo program's practical limit used by `memo` (`MEMO_MAX_BYTES`). Transaction requests (`solana:<https-link>`) are refused with a distinct reason in v1.
- **Rationale**: FR-020 requires reading the request in full and refusing what cannot be read, with the part named.
- **Alternatives considered**: keep `scan-payload.ts`'s partial parser (drops amount with `spl-token`, ignores reference/memo) — the opposite of what a USDC request needs.

## R3. Persistence: a generic per-Powerup state seam in core

- **Decision**: add `STORAGE_KEYS.POWERUP_STATE` (`salmon_powerup_state`) holding `Record<powerupId, unknown>`, and a core hook `usePowerupState<T>(powerupId, initial)` in `packages/shared/src/hooks` built like `useInstalledPowerups` (module-level store, `useSyncExternalStore`, async hydrate, write-through). The Powerup imports the hook from `hooks` (allowed) and keys its own value by `${accountId}:${networkId}`.
- **Rationale**: the boundary lint forbids `storage` under `powerups/**` and must not be loosened; the seam is generic so Stake positions or any future stateful Powerup reuse it. Same storage adapter `INSTALLED_POWERUPS` already uses, so it survives restarts and account switches (US2 scenario 6).
- **Alternatives considered**: a Payments-specific core hook (Powerup vocabulary in core, copied later); a lint exception (weakens the foundation); no persistence (a request the user closed is lost — fails US4).

## R4. Settlement detection from the device

- **Decision**: `findTransferRequestSettlement(rpc, { reference, mint, recipientOwner, amountAtomic })`: `getSignaturesForAddress(reference, { limit: 12, commitment: 'finalized' })`; for each non-errored signature, `getTransaction(sig, { encoding: 'jsonParsed', commitment: 'finalized', maxSupportedTransactionVersion: 1 })`; sum `post − pre` token balances filtered by `mint` and `owner === recipientOwner`; settled only when the delta equals `amountAtomic` exactly; `payer` = first account key (fee payer). Returns `{ signature, payer, blockTime }` or `null`. The RPC comes from `solanaRpcFor(networkId)`, a thin helper over `createSolanaRpc(SOLANA_NETWORKS[networkId].config.nodeUrl)` (the runtime-merged config `SolanaReadAccount.getLatestConfig` already reads), so the Powerup never touches an account class.
- **Rationale**: salmon-pay's own rule ("confirmation by signature alone is insufficient") and FR-006. `finalized`, not the wallet's usual `confirmed`, because this credits someone else's transfer. `limit: 12` is enough: a fresh reference is touched by the payer only.
- **Alternatives considered**: `signature-status.ts` (`getSignatureStatuses`, a different question); a WebSocket `logsSubscribe` on the reference (cannot resume after background/lock; polling matches the repo's own reasoning for pending transactions).

## R5. Polling cadence and expiry

- **Decision**: while a request sheet is open, poll every `PAYMENTS_STATUS_POLL_MS = 5_000`; the list refreshes each pending request once on mount and again when the app regains focus (the repo's existing app-state hook if present, otherwise on mount only). Expiry is judged on the device from `expiresAt`; a paid request is terminal; an expired one is never re-polled. A failed poll keeps the last state and sets `lastCheckError` (rendered as a quiet notice, never as a state flip).
- **Rationale**: SC-003 (paid within 10 s), FR-008/FR-009, and RPC courtesy (one light call per tick).
- **Alternatives considered**: 3 s like salmon-pay's server throttle (server-side, many watchers); 15 s (misses SC-003).

## R6. UI composition — blocks, and the one gap opened

- **Decision** (owner's choices + defaults):
  - Tab root (form, `paddingTop: 0`, `spacing.headerPadding` sides): `AmountEntryCard` (`subtext` = `≈ {formatPrecise(amount × usdc.price)} {CURRENCY}` exactly as Send's amount step builds it, derivation hoisted to a shared helper `fiatLine`), `TextField` for the note (`maxLength` bounded by memo bytes), `ChipGroup variant="outline"` for expiry (1 h / 24 h / 7 d, 24 h preselected), `PrimaryButton` "Create request" at the fixed narrow step (`componentSizes.copyButtonWidth × buttonHeightCompact`, as Memo).
  - Under it, `SectionLabel variant="caps"` "Requests" and a list of `ListRow` (leading `IconBubble` with the manifest glyph, title = amount + USDC, subtitle = note or "No note", trailing = state text in `valueInkFor` tone, `onPress` opens the sheet); empty → `StateBlock tone="empty"`; loading → `SkeletonRow`.
  - The request sheet: `BottomSheetContainer` (title `SheetTitle` "Payment request") → `QRCode` with `brandKnockout` (the overlay `ReceiveSheet` draws today, hoisted into the kit as a prop) → amount line → `FactsCard` rows (For: note; Expires in: countdown `KeyValueRow` recomputed on the Powerup's interval; Status: pending / paid / expired; when paid: Paid by `AddressCopyRow`, `ExplorerLinkButton`) → `SecondaryButton` Copy (with the platform copy feedback) and Share (mobile share sheet; DOM copy) → `SecondaryButton` Remove (destructive tone through the button's own contract, no red literal). No Close button (DESIGN.md §Sheets).
  - The sheet holds one state: the request and what the network says about it. Its second tap only dismisses, copies or removes; nothing inside it leads somewhere else, so it stays a sheet under the state rule.
- **Gap opened (runbook §4)**: "a QR of a value, in a sheet, with the brand knockout" has no block; the closest is `ReceiveSheet`, which is bound to an address. The decision taken here is the smallest kit change: `QRCodePropsBase.brandKnockout?: boolean`, drawn by the `QRCode` twins, consumed by `ReceiveSheet` and the request sheet. Record it in the SOT gap table as closed by this lot.
- **Alternatives considered**: a Payments-local QR overlay (forbidden duplicate); `ReceiveSheet` with a `value` override (a one-state sheet gaining a second meaning).

## R7. Send learns the standard — where it lands and who consumes what

- **Decision**:
  - `packages/shared/src/utils/scan-payload.ts` (hoisted from mobile, same exported names): `classifyScanPayload(raw, activeChain)` returns `{ kind: 'valid', address, request?: TransferRequest }` — bare address unchanged; a full transfer request parsed; a malformed request → `{ kind: 'invalidRequest', reason }`. Mobile `QRScanner/scan-payload.ts` becomes a re-export; `QRScanResult` gains `request?`.
  - `SendFlowState` gains `request: SendRequest | null` (`SendRequest` = parsed request + resolved token) and a `startFromRequest(request, tokens)` action that sets recipient, token (must exist in the user's holdings by mint, else `reason: 'tokenNotHeld'`), amount, and jumps to `review`. The mobile recipient route calls it from `handleScan` and pushes `/send/review`; `StepRecipient` on the DOM adds a paste field (`TextInput` with `mono`, placeholder "Paste a payment request") that calls the same action.
  - Review (both twins): when `request` is set, the amount row is read-only, and two `KeyValueRow`s "Requested by" (label) and "For" (message) sit above the existing rows; insufficient balance renders the existing failure notice and disables confirm (FR-023).
  - `SendTransactionParams` + `SolanaTransferOptions` gain `memo?: string` and `references?: readonly string[]`; `useSendTransaction` forwards them; `transfer.ts` appends `references` as `AccountRole.READONLY` metas to the transfer instruction (both SPL builders) and adds the memo instruction on the SOL path too, immediately before the transfer.
  - Consumers named: `useSendFlowState` (mobile provider + DOM `SendPage`), `useSendTransaction` (Send only), `SolanaAccount.transfer` (Send, NFT send — unaffected, options optional), `transfer.ts` (`SolanaAccount`, tests, golden vectors), `scan-payload.ts` (Send recipient, `AddressForm`, NFT send — all bare-address callers keep working), `QRCode` (`ReceiveSheet` twins).
- **Rationale**: FR-020..027; the owner's "a normal Send where the price is already set by the receiver".
- **Alternatives considered**: routing the payer through `requestSignature` as a Powerup build (needs a backend build endpoint and puts a core action behind an installable module — rejected by the owner's framing); a `solana:` protocol handler on the extension (no precedent, side-panel registration is unproven; paste ships now, the handler is a follow-up task marked optional).

## R8. USDC mints and the reference key

- **Decision**: `USDC_MINT_BY_NETWORK` in `blockchain/solana/known-mints.ts` with mainnet `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` and devnet `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`, checked against `salmon-pay/lib/config.ts` at implementation time. The asking side resolves the display token (symbol, decimals, price, logo) from the wallet's token list by mint, and refuses to create a request if the network's USDC is not in the catalogue (`StateBlock tone="error"`). The reference is `await generateKeyPair()` → `getAddressFromPublicKey(publicKey)` from `@solana/kit`; the private half is never stored.
- **Rationale**: no USDC constant exists outside tests; a symbol match against the live list would accept a fake "USDC". `generateKeyPair` is not on the lint's restricted list and is not the account derivation in `factory.ts`.

## R9. Backend

- **Decision**: one read-only entry `payments: { tier: 'core', networks: ['solana-mainnet', 'solana-devnet'], contributor: null, endpoints: [] }` in `src/services/solana/powerups/registry.js`, plus `powerups.payments.enabled: true` in the four `network-capabilities-<stage>.js`. No adapter, no route, no persistence.
- **Rationale**: FR-012 (the per-network switch) is the only backend contact; the client never sends a request or a payment to the backend.
