# Research: Solana Pay transaction requests (spec 043)

Every decision below was checked against the code on `feat/043-solana-pay-transaction-request` (base `b8154165`) and against two external sources:

- **Solana Pay spec 1.1**, transaction request section. The published page (https://solana.com/docs/tools/solana-pay/specification/version1-1) answered HTTP 429 when fetched; the same text was read from its source, `solana-foundation/solana-pay` `typescript/packages/solana-pay/spec/SPEC1.1.md` (commit `a5c1c831`), and the reference wallet code `typescript/packages/solana-pay/core/src/fetchTransaction.ts` at the same commit.
- **Kora full demo** (https://solana.com/docs/tools/kora/guides/full-demo, also 429). Read from its source, `solana-foundation/kora` `examples/getting-started/demo/client/src/full-demo.ts`, `examples/getting-started/demo/server/kora.toml`, and `.claude/skills/kora-client/references/guides.md`.

Claims marked **(unverified)** were not confirmed against a source or a run; each names the check that settles it.

## What the standard says (quoted facts the plan builds on)

From SPEC1.1 §Transaction Request:

- Link: "The value must be a conditionally URL-encoded absolute HTTPS URL… the wallet must URL-decode the value… If the decoded value is not an absolute HTTPS URL, the wallet must reject it as **malformed**."
- GET: "The request should not identify the wallet or the user." "The wallet should display the domain of the URL as the request is being made." Response `{"label","icon"}`; "`<icon>` value must be an absolute HTTP or HTTPS URL of an icon image. The file must be an SVG, PNG, or WebP image, or the wallet must reject it as **malformed**." "The wallet must handle HTTP client error, server error, and redirect responses."
- POST body `{"account":"<account>"}`; response `{"transaction"}` base64, optional `message` ("must display at least the first 80 characters") and optional `redirect`. "The application may respond with a partially or fully signed transaction. The wallet must validate the transaction as **untrusted**."
- Empty signatures: "The wallet must ignore the `feePayer`… and set the `feePayer` to the `account` in the request", same for `recentBlockhash` (latest blockhash).
- Nonempty signatures: "The wallet must not set the `feePayer` and `recentBlockhash`." "The wallet must verify the signatures, and if any are invalid, the wallet must reject the transaction as **malformed**."
- "The wallet must only sign the transaction with the `account` in the request, and must do so only if a signature for the `account` in the request is expected."
- "If any signature except a signature for the `account` in the request is expected, the wallet must reject the transaction as **malicious**."
- Error handling: on a client or server error to the POST "the wallet must consider the entire transaction request as failed"; an optional `{"message"}` body is shown (first 80 characters at least).
- `redirect`: "Redirect URLs should only be followed if the transaction is successful." A "should": a wallet may ignore it.
- Nothing in SPEC1.1 mentions CORS. The reference `fetchTransaction` uses `mode: 'cors', credentials: 'omit'`.

From Kora:

- The demo client builds the transaction with Kora's address as fee payer, signs the user's slot, then calls Kora `signTransaction`, which returns `signed_transaction` **without sending it**; the client sends it. So Kora signs on request and never submits on its own in this path.
- `guides.md`: "for a request with an empty signature array, `signTransaction` also replaces the recent blockhash. Always sign the returned transaction." So a merchant can call `signTransaction` on an unsigned transaction and hand the wallet a transaction whose fee-payer slot is filled and whose user slot is empty: the Solana Pay order.
- `kora.toml` (demo): `cors_allow_origins = ["*"]`; `[validation.price] type = "margin" # free / margin / fixed`; a mock price source; allowed programs and tokens lists. **(unverified)** that `signTransaction` accepts a transaction whose user slot is empty without complaint when Lighthouse is off; the devnet merchant's `sponsored` route is the check (quickstart §2).

## R1. Where the link is recognised

**Decision**: `parseTransferRequest` (`packages/shared/src/blockchain/solana/transfer-request.ts:81`) keeps refusing `https://` paths with `reason: 'transactionRequest'`, and a non-HTTPS web address (`http://…`) becomes its own reason `'transactionRequestMalformed'`. `classifySolanaPay` (`packages/shared/src/utils/scan-payload.ts`) turns `'transactionRequest'` into a new classification `{ kind: 'transactionRequest', link }`, where `link` comes from a new `parseTransactionRequestLink(raw)` that decodes once, requires `new URL(link).protocol === 'https:'`, and keeps the query string. `readSettledPaymentLink` gains `{ kind: 'transactionRequest', link }`.

**Rationale**: both capture paths already route through `classifyScanPayload` (mobile `QRScanner.tsx:64`) and `readSettledPaymentLink` (mobile `send/index.tsx:208`, DOM `StepRecipient.tsx:136`), so one shared change reaches camera and paste on both apps (FR-003). The parser already isolates the `https` branch; the classifier is where a link becomes an action.

**Alternatives**: a separate pre-check in each capture site (three copies, drifts); folding transaction requests into `TransferRequest` (two shapes with nothing in common but the scheme).

## R2. Talking to the merchant: shared `fetch`, CORS on the extension

**Decision**: one shared module, `packages/shared/src/blockchain/solana/transaction-request.ts`, does both requests with the platform `fetch`:

- GET with `Accept: application/json`; POST with `Accept` and `Content-Type: application/json`, body `{"account"}`. No other header. `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, `cache: 'no-store'`.
- `redirect: 'error'` on both apps. React Native's own `fetch` follows redirects and ignores `redirect`, so mobile hands the module `expo/fetch` (`setMerchantFetch`, at boot in `AppProviders.tsx`): in the installed Expo SDK 57 its native module refuses a redirect when the mode is `'error'` (iOS `NativeResponse.swift` completes the redirect with `nil` and raises `FetchRedirectException`; Android turns `followRedirects` off and raises the same), and it streams the body, so the 64 KiB count applies on mobile too. It ships inside the `expo` package already in the binary, so the change is JS-only. As a second line, after every response the module checks `response.url` against the link parser's rules (absolute `https:`, no IP literal, no `localhost`) and the link's own host, and refuses otherwise. An empty `response.url` is refused too: browsers report it, and React Native's `fetch` (whatwg-fetch over RN's `XMLHttpRequest`, which implements `responseURL`) does as well, so an answer with no address is one the platform cannot vouch for. iOS App Transport Security and Android's default cleartext ban (no `usesCleartextTraffic` / `NSAllowsArbitraryLoads` in `apps/mobile/app.json`) already block a plain-HTTP hop in release builds.
- 10 s timeout per request (`AbortController`, the pattern in `useAddressValidation.ts:153`).
- 64 KiB cap per response: refused early on a larger `Content-Length`, and read through `response.body.getReader()` with a running count where a stream exists (the extension, and mobile through `expo/fetch`); where `body` is absent (a platform fetch without streams), `text()` then a byte count (`TextEncoder`, not string length), bounded by the 10 s timeout. A legacy/v0 transaction is at most 1232 bytes (≈1.7 KB base64), v1 4096, so 64 KiB is generous and still small.
- Hosts that are IP literals, `localhost` / `*.localhost`, `.local` (mDNS) or a single label (no dot), each with or without one trailing dot, are refused before any request, so a QR cannot make the wallet post the user's address to a device on the local network. DNS that resolves a public name to a private address is not covered.
- Error bodies: on 4xx/5xx a JSON `message` is read (first 80 characters, plain text) and shown as the merchant's words.
- Merchant text (label, message, error words) is shown with control characters (Unicode Cc) and bidi controls removed, and cut: label 64 characters, message 256, error words 80. A right-to-left override would otherwise let a label read as another name.
- `redirect` in the POST response is ignored (spec "should"; FR-008 ignores unknown fields). Following it would open a merchant-chosen page from the wallet.

**Extension network finding**: `apps/extension/wxt.config.ts` declares `host_permissions` for the Salmon API and CDN only, and sets no `content_security_policy`, so MV3's default extension-page CSP applies (`script-src 'self'; object-src 'self'`), which does not restrict `connect-src` or `img-src`. A `fetch` from the side panel (the page that renders `SendPage`; `sidepanel/main.tsx` imports `popup/App`) to an arbitrary HTTPS origin therefore runs, **subject to CORS**: without a host permission, an extension page is a cross-origin client like any web page. The merchant must answer with `Access-Control-Allow-Origin` (and the preflight for the JSON POST). The background service worker has the same constraint, so moving the request there gains nothing. The only bypass is a host permission (`https://*/*`), which shows "read and change all your data on all websites" at install and in review and would need a new `manifest-permissions.json` baseline; rejected. Consequence: a merchant that serves no CORS headers works on mobile and fails on the extension with "the merchant could not be reached". The devnet merchant sends `Access-Control-Allow-Origin: *`, as Kora's own server does by default. Later option if real merchants need it: `optional_host_permissions` requested per origin at the moment of payment.

**Identifying headers**: the wallet adds none. The platform adds two the code cannot remove: `User-Agent` on both platforms (on iOS it carries the app's bundle name) and, on the extension, `Origin: chrome-extension://<id>` on every CORS request. Both name the wallet, never the user; the extension id is the same for every install. Recorded as a residual against "should not identify the wallet".

**Alternatives**: `@solana/pay` (declined in spec 033 R1, and its `fetchTransaction` decompiles without lookup tables, which breaks v0 with address lookup tables); a backend proxy (would hand Salmon's backend every merchant URL and user address, and add a server to the payment path).

## R3. Checking and preparing the merchant's transaction

**Decision**: `packages/shared/src/blockchain/solana/transaction-request-checks.ts`, pure apart from two RPC reads, mirroring the reference `fetchTransaction` plus the rules it leaves out:

1. base64 → `getTransactionDecoder()`; message → `buildTransactionFromEncodedMessage` (`utils/dapp-approval.ts:214`), which also refuses unsupported versions and oversize messages.
2. **Signatures present** (any non-zero slot):
   - every non-zero signature verifies (`verifySignature` with the key from `getPublicKeyFromAddress`; Ed25519 verify exists on mobile through `@solana/webcrypto-ed25519-polyfill`'s `install()`, `apps/mobile/index.js:113`, and is already used by `seed-vault-signer.ts:153`) → else `invalidSignature` (malformed);
   - the user's address is one of the message's signer slots → else `notForThisAccount`;
   - every slot except the user's is filled → else `missingSignature` (FR-014, "malicious" in the standard);
   - the user's slot is empty → else `alreadySigned` (a filled user slot is a signature the user never made);
   - `staticAccounts[0]`, the fee payer, is left as is; the lifetime token must be a blockhash the active network still accepts (`rpc.isBlockhashValid`) → else `staleOrWrongNetwork`. A durable-nonce transaction fails this check and is refused: its signature never expires.
3. **No signatures**: set fee payer = user and lifetime = `getLatestBlockhash` (spec "must"). If the fee payer already is the user, only the lifetime changes, patched on the compiled message the way `core/broadcast/solana.ts:103-107` does (round-trips byte-exact). Otherwise `decompileTransactionMessageFetchingLookupTables` (kit 8.4.0, present) → `setTransactionMessageFeePayer` → `setTransactionMessageLifetimeUsingBlockhash` → `compileTransaction`. Then, as the standard requires, if any signer other than the user remains → `missingSignature`.
4. The result keeps the exact wire bytes that review, preview and signing all use.

**Rationale**: these are the standard's rules (quoted above) plus two the reference wallet skips: the user must be an expected signer (spec: "only if a signature for the account… is expected") and the user's slot must be empty. Splitting checks from HTTP keeps every case unit-testable with locally generated keys.

**Alternatives**: `core/verify/solana-transaction.ts` (`assertSolanaTransactionMatches`). Rejected for this flow: it checks a backend-built transaction against what the flow _declared_ (fee payer = the signing wallet, an allow-list of programs and instruction codes). A merchant transaction has no declaration: its fee payer is the sponsor by design and its programs are the merchant's choice. Its risk class is a dApp transaction's, so the protection is the effect preview (R5), not an allow-list. The `feePayer` expectation in `core/verify` stays untouched and is never asked to accept a foreign payer.

## R4. Signing and sending: a "received" proposal through core's confirmation

**Decision**: the review, the phrase gate, the wait, the receipt and the pending banner are core's `SignatureRequestProvider` + `ConfirmationHost`, already mounted above both apps (`apps/extension/src/entrypoints/popup/App.tsx:616-620`, `apps/mobile/app/(app)/_layout.tsx:167-245`). Core gains a second proposal kind, `ReceivedTransactionProposal` (`source: 'received'`): the full wire transaction with its signatures, the address it was fetched for, and no `expect`. `signProposal` (`core/signing/index.ts`) routes it to a new `sendReceivedSolanaTransaction` in `core/broadcast/solana.ts` that:

1. asserts the signing account is the address the merchant was given (`signer`), else `accountChanged`;
2. re-runs the signed-case checks of R3 on the exact bytes (cheap, and it is the last moment before the key is used);
3. asserts the lifetime is still valid on the signer's RPC (`isBlockhashValid`), else `expired`;
4. `signTransactionWith` (`blockchain/solana/signing.ts`): fills only the signer's slot and refuses a signer that answers for another address;
5. sends the bytes unchanged (no blockhash patch, unlike `signAndSendSolanaTransaction`), through `sendExpectingOutcome`;
6. waits with `confirmSolanaSignature`, passing `getBlockHeight() + 150` as `lastValidBlockHeight`. A blockhash that is still valid expires within 150 blocks of now, so this bound is never early; at worst the "expired" verdict comes a little later.

The Powerup door stays closed to it: `requestSignature` (the Powerup entry, `core/confirmation`) rejects any proposal with `source`, and the received entry is a separate hook, `useRequestReceivedSignature`, in `core/confirmation/received.ts`, which the Powerups lint block (`eslint.config.js:223-244`) adds to its restricted patterns. A Powerup therefore cannot skip its declared-effects check by labelling its proposal "received".

**Rationale**: FR-018 (phrase gate) is already inside `SignatureRequestProvider.confirm`; FR-020's "usual wait, confirmation and receipt" is exactly what the host renders; `refresh` and the expired-quote rule already exist for US4. The mobile dApp review already renders a dApp transaction through this same `TransactionConfirmation` (`apps/mobile/src/mwa/MwaRequest.tsx` `TransactionApproval`), so the screen is proven for untrusted transactions.

**Alternatives**: `approveSolanaTransactionRequest` (`utils/dapp-approval.ts:598`), whose `signAndSendTransaction` branch already signs a received transaction preserving co-signers with a WYSIWYS check. It ends by answering a dApp bridge with a signature and does not wait for confirmation or show a receipt, so the Send-style ending would have to be rebuilt around it. Its rules are the same ones `sendReceivedSolanaTransaction` applies. The extension's `DAppTransactionApprovalPage` / `DAppTransactionApprovalView` are bound to the dApp popup window and its background channel (`useDAppApproval`), which a payment started in the side panel does not have.

## R5. The review: the dApp preview and display, plus the merchant

**Decision**: the hook builds a `DAppSignAndSendTransactionRequest` from the prepared bytes (`message` = base58 message bytes, `transaction` = base58 wire) and calls the plain functions the dApp screens use: `loadSolanaTransactionApprovalDetails` (fee, fee payer `staticAccounts[0]` at `dapp-approval.ts:376`, blockhash) and `previewSolanaApprovalEffects` (strict effect preview: durable nonce, unreadable programs, approvals, would-fail). The display is `dappTransactionDisplay` (`utils/dapp-transaction-display.ts`) with three optional inputs added: `requester` (merchant label + domain, replacing the "requesting site" row), `message` (the merchant's message, shown in full as plain text), and `feePayer` (when it is not the signing account, the fee row reads "Network fee — paid by `Kora…`" instead of a cost to the user). `dappTransactionGate` decides `requiresHold`. MWA's callers pass none of the new fields and render as today.

Two rules on top, both from the spec: when the user pays the fee (US3) and their SOL balance is below the fee plus the SOL the preview shows leaving, confirm is disabled with "not enough SOL for the network fee"; and the preview must have answered before the review opens (the preview runs while the merchant sheet shows "Preparing", so the review never shows "simulating").

**Rationale**: FR-015 asks for "the same risk class as a dApp transaction"; using the same functions gives the same warnings, the same hold rules and the same blind-signing protection (approvals, unreadable programs) without a parallel copy. Rent for a new token account appears as SOL leaving the user because the preview diffs the user's lamports (spec edge case).

## R6. Simulation of a partially signed transaction

**Decision**: keep the existing simulation untouched: `simulate()` in `blockchain/solana/simulation-rpc.ts:157-167` runs with `sigVerify: false` and `replaceRecentBlockhash: true`, on a copy whose signature slots are all empty (`emptySignatureMap`, as `previewApprovalEffects` already does). Blockhash validity and signature validity are checked separately and explicitly (R3: `isBlockhashValid`, local Ed25519 verification).

**Why**: `sigVerify: true` is impossible before the user signs (their slot is empty) and the RPC rejects it together with `replaceRecentBlockhash`. `replaceRecentBlockhash` changes only the node's simulated copy, never the bytes the wallet holds, signs or sends; the "must not replace the blockhash on a signed transaction" rule is about those bytes, and nothing in this flow writes to them after the merchant (signed case) or after the wallet's own preparation (unsigned case). Simulating with the merchant's real blockhash would turn an expired or other-network blockhash into a generic "would fail" verdict and would change the shared simulation every dApp review uses; the explicit `isBlockhashValid` check gives the precise answer ("expired" or "for another network") instead. Signature checks belong on the device anyway: a simulation cannot vouch for a signature it did not verify.

## R7. Staleness and refresh (US4)

**Decision**: `ReceivedTransactionProposal` carries `isStale()` (re-asks `isBlockhashValid` on the active RPC) and `refresh()` (the whole fetch → check → preview again, against the same link and account). `useSignatureRequestHost.confirmOrRefresh` asks `isStale()` before confirming; when stale it refreshes, and if the refreshed `display` equals the one the user saw (same rows, warning and requester), it goes straight on to confirm; otherwise it stays on the review with a note "The merchant updated this payment. Check it again." A refresh failure leaves the review with "This payment expired" and nothing is signed. No `expiresAt` countdown: the merchant's blockhash age is not knowable in advance.

**Rationale**: FR-019 and SC-005; the host already owns the "never sign a stale build" rule (`useSignatureRequestHost.ts:56-75`), so the merchant case extends it instead of adding a timer in the hook. Signed bytes are never altered locally: an unsigned transaction is also re-fetched rather than re-stamped, so what is signed is always byte-identical to what was previewed (FR-016).

## R8. Watch-only, wrong chain, account switches

- Watch-only (FR-004, US5): the hook refuses before any request when `isSignableAccount(account)` (`utils/account.ts:121`) is false. Home already hides Send for watch-only accounts (`apps/extension/src/pages/home/HomePage.tsx:691`); the check covers any path that still reaches the recipient field.
- Non-Solana network: `classifySolanaPay` already answers `wrongChain` when the active chain is not Solana.
- Account switch mid-review: `sendReceivedSolanaTransaction` refuses when the active signer differs from the address that was POSTed (signature-slot confusion), rather than relying on `signTransactionWith`'s generic "not a required signer".
- Network switch mid-review: the lifetime check on the signer's RPC fails, the host refreshes, and the refetched transaction (still for the merchant's network) is refused as `staleOrWrongNetwork`.

## R9. Merchant icon (untrusted SVG)

**Decision**: the icon URL is validated per the standard (absolute `http:`/`https:`, path ending `.svg`, `.png` or `.webp`, case-insensitive; else the request is malformed, FR-006). It is **rendered only when `https:`**; an `http:` icon or one that fails to load shows the globe placeholder (`GlobeIcon` in an `IconBubble`, as `AppIdentity` does). DOM: `<img src referrerPolicy="no-referrer" alt="">` — an SVG loaded as an image runs no script and loads no sub-resources, by browser rule. Mobile: `expo-image` (already a dependency, `apps/mobile/package.json:61`) draws SVG as a static image with no scripting **(unverified on Android for SVG; the `sponsored` route serves an SVG icon to check, PNG fallback is the same code path)**. Never `react-native-svg`'s `SvgUri`/`SvgXml` and never a WebView: those parse the document.

**Alternative**: always the placeholder (simplest, but FR-007 asks for the icon).

## R10. Devnet test merchant

**Decision**: one dev-only Node script, `scripts/devnet-solana-pay-merchant.mjs`, beside `scripts/devnet-fixtures.cjs`. `node:http` on a local port, published as HTTPS through `cloudflared tunnel --url http://localhost:<port>` (no account needed; the wallet accepts only `https`). Imports only `@solana/kit` and `@solana-program/system` / `@solana-program/memo`, all already hoisted at the repo root. Routes under `/pay/<case>` serve the sponsored and unsponsored transactions and each User Story 2 failure (quickstart §2). The `sponsored` route uses a real Kora node when `KORA_RPC_URL` is set, calling its JSON-RPC `signTransaction` with plain `fetch` (no `@solana/kora` dependency); without it, a local devnet keypair (wallet B from `SALMON_TEST_SEED_B`, the fixture wallet `devnet-fixtures.cjs` already funds) signs as sponsor, which produces the same wire shape. Tampered and missing-signature cases are built locally because Kora would refuse to make them. Devnet RPC is hard-coded; the script prints addresses and URLs, never a key.

**Rationale**: the owner's decision; one file, no new dependency, never imported by any app or package, so no bundle can carry it. Kora itself runs as its guide says (its own binary/container and `kora.toml` with `type = "free"` pricing); the script does not wrap it.

**Alternatives**: a fixture server inside the Playwright suite (would tie a manual devnet check to e2e plumbing); a hosted merchant (a server to run and pay for).

## R11. Copy

New strings live under `solanaPay.*` in `packages/shared/src/locales/{en,es}/translation.json`; the implementer writes English and Spanish (owner decision 2026-11-12, spec §Clarifications). `send.request.errors.transactionRequest` ("This kind of payment request is not supported yet") is removed; its one other use, the DOM NFT send (`StepRecipient.tsx:148`, a flow that takes no payment links), gets `send.request.errors.paymentLinkNotHere`. `scripts/check-i18n.mjs` enforces parity.
