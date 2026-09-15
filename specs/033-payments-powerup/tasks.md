# Tasks: Payments (spec 033)

Order is dependency order. `[P]` = can run in parallel with its neighbours. Every task ends with the package's typecheck + lint + tests green; the lot ends with every gate in `quickstart.md`.

## Phase A — core shared (no UI)

- [ ] A1 `blockchain/solana/known-mints.ts`: `USDC_MINT_BY_NETWORK` (mainnet, devnet; verified against salmon-pay `lib/config.ts`), exported from the solana barrel.
- [ ] A2 [P] `blockchain/solana/networks.ts`: `solanaRpcFor(networkId)` over the merged `SOLANA_NETWORKS` config (`createSolanaRpc`, cached per nodeUrl like `SolanaReadAccount.getRpc`).
- [ ] A3 [P] `blockchain/solana/transfer-request.ts` + test: `parseTransferRequest`, `encodeTransferRequest`, `TransferRequest`, `TransferRequestParseReason`; the seven vectors in `contracts/transfer-request-uri.md`.
- [ ] A4 [P] `blockchain/solana/transfer-request-settlement.ts` + test: `findTransferRequestSettlement(rpc, query)` per research §R4; decision table (match / wrong mint / wrong owner / delta ≠ / errored tx / no signatures / rpc throws).
- [ ] A5 `utils/scan-payload.ts` (hoisted from mobile, same names) + test; mobile `QRScanner/scan-payload.ts` re-exports; `QRScanResult.request?`; the scanner surfaces `invalidRequest` reasons.
- [ ] A6 [P] `storage/types.ts` `STORAGE_KEYS.POWERUP_STATE`; `hooks/usePowerupState.ts` + test (hydrate, write-through, two subscribers see one write, immutable updates).
- [ ] A7 `types/ui/send-sheet.ts` `SendRequest`; `types/send.ts` + `types/blockchain.ts` `memo` / `references`; `hooks/useSendFlowState.ts` `request`, `startFromRequest`, `clearRequest` + tests (held / not held / no amount / SOL); `hooks/useSendTransaction.ts` forwards + test.
- [ ] A8 **(owner sign-off, constitution III)** `blockchain/solana/transfer.ts`: `TransferOptions.references` on both SPL builders and the SOL path; memo on the SOL path; `SolanaAccount.transfer` passes them through; golden vectors for both paths (instruction order, `AccountRole.READONLY`, non-signer). Own commit.
- [ ] A9 `send.request.*` English keys in `locales/en/translation.json` (Spanish: owner).

## Phase B — the Powerup and its twins

- [ ] B1 `powerups/payments/`: `manifest.ts` (id `payments`, core, mainnet+devnet, `iconName` from the allow-list — see B0), `types.ts`, `constants.ts` (`EXPIRY_OPTIONS`, `PAYMENTS_STATUS_POLL_MS`), `locales/en.json` (+ `es.json` when the owner writes it), `index.ts`; registry `MANIFESTS`, `powerups/locales.ts`, `powerups/index.ts`, `scripts/check-i18n.mjs` `POWERUP_LOCALES`, `scripts/check-powerups-bundle.mjs` marker (`payments.catalog`), `scripts/check-dom-parity.mjs` `MAP`.
- [ ] B0 Icon: if no allow-listed glyph fits, add one (`QrCode` or `Receipt`, Phosphor) to `PowerupIconName` and both `icons.ts` in its own commit before B1.
- [ ] B2 `powerups/payments/usePaymentsScreenLogic.ts` + `usePaymentRequestStatus.ts` + tests: form validation (decimals ≤ 6, > 0), `fiatLine` (hoisted from Send's two identical derivations, Send keeps working), create (reference via `generateKeyPair` + `getAddressFromPublicKey`, id, expiry), list per `${accountId}:${networkId}`, status rows (`FactsCardRow[]` built once), countdown, poll/stop rules, expiry on read, remove, copy.
- [ ] B3 [P] Kit: `QRCodePropsBase.brandKnockout`; both `QRCode` twins draw it; both `ReceiveSheet` twins switch to the prop; tests unchanged/green; DOM parity green.
- [ ] B4 `types/ui/payments-screen.ts` contracts.
- [ ] B5 [P] Mobile: `components/PaymentsScreen/{PaymentsScreen,PaymentRequestSheet,types}.tsx`, `screens/PaymentsTab.tsx`, `src/powerups/index.ts` branch; Jest: form renders, empty list, row states, sheet paid/pending/expired, remove.
- [ ] B6 [P] DOM: `packages/ui/src/components/PaymentsPage/{PaymentsPage,PaymentRequestSheet,types}.tsx`, `powerups.ts` / `.off.ts`, `apps/extension/.../powerupBodies.tsx` branch (+ `HomePage.test` mock); Vitest mirrors B5.

## Phase C — Send learns the standard (UI)

- [ ] C1 Mobile `app/(app)/send/index.tsx`: `handleScan` with a `request` → `startFromRequest` → `/send/review` or `/send/amount`; `tokenNotHeld` → the existing failure notice. `review.tsx`: Requested by / For rows, amount read-only, `memo`/`references` on send.
- [ ] C2 [P] DOM `SendPage/StepRecipient.tsx`: paste field; `StepReview.tsx`: same rows and lock; `SendPage.test` cases.
- [ ] C3 Insufficient balance with a locked amount: confirm disabled, existing copy (both twins); test.

## Phase D — backend and closing

- [ ] D1 Backend `registry.js` `payments` entry + four stage configs + catalog/router specs; lint + unit tests; own commit on `feat/powerups-foundations` there.
- [ ] D2 Docs: `docs/POWERUPS-UI.md` §1.5 gains the QR-in-a-sheet note (`QRCode brandKnockout`) and §2 the `usePowerupState` seam; `AGENTS.md` Powerups row unchanged; `CHANGELOG.md` unreleased entry.
- [ ] D3 Gates: all of `quickstart.md`; clone ceiling adjusted downward if the hoists earned it; coverage ratchets unchanged or up.
- [ ] D4 Owner: Spanish copy for `payments.*` and `send.request.*`; sign-off on A8, B3, A6; hand-test list in `quickstart.md`.
