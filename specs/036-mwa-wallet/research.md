# Research: Mobile Wallet Adapter wallet on Android

Sources were read from the published packages and official docs; nothing here is inferred unless marked.

## R1. Library

- **Decision**: `@solana-mobile/mobile-wallet-adapter-walletlib` 1.4.5 (npm, peer `react-native >0.74`; we run 0.86.3). Native dependency `com.solanamobile:mobile-wallet-adapter-walletlib:2.0.2` plus `digital-asset-links-android:1.0.3`.
- **Rationale**: the only React Native bridge for the wallet side of MWA. The README marks it "alpha… the API is stable". Writing our own Kotlin bridge over walletlib 2.0.2 would duplicate it.
- **Alternatives**: own native module (more code, same native lib); not doing MWA (Salmon unusable with dApps on Seeker).
- **Risk**: the bridge is an old-architecture native module (`ReactContextBaseJavaModule`); the app runs `newArchEnabled=true`. Compatibility relies on React Native's interop layer. **Spike result (T005, `Seeker_API35`, debug build)**: the official `fakedapp` (release `wallet-standard-mobile@0.6.0`) opened `MwaActivity`, React Native ran `MobileWalletAdapterEntrypoint` with Fabric on, the bridge created the scenario and established the session over the local WebSocket, and the stub's `UserDeclined` reached the dApp as "authorization request failed". The bridge works under the new architecture.

## R2. Where the request is read

- **Decision**: a dedicated Android activity, not `MainActivity`.
- **Rationale**: the bridge's `createScenario` reads `reactContext.getCurrentActivity()?.intent?.data` and parses it as the association URI. `MainActivity` is `singleTask` and hosts expo-router; a second activity with its own task keeps the main app's navigation untouched (FR-011) and lets the approval sit over the dApp. This mirrors the official React Native example wallet's manifest (two `solana-wallet` intent filters, `order=1` VIEW+DEFAULT+BROWSABLE and `order=0` DEFAULT).
- **Alternatives**: route inside `MainActivity` — rejected: the intent would arrive through `onNewIntent` and depends on `setIntent` behaviour not verified for this RN version; it would also bring the whole app stack on top of the dApp.

## R3. Who sends "sign and send"

- **Decision**: Salmon sends, through `account.getRpc()` (the backend-supplied provider URL after `fetchAndMergeNetworkConfigs`), and returns the signatures.
- **Rationale**: the bridge calls `completeWithSignatures(response.signedTransactions)`; the RPC URL it derives from the cluster (`clusterToRpcUri`, public Solana endpoints) is only passed as request metadata. The existing `approveSolanaTransactionRequest` signAndSend branch already sends and enforces "what you see is what you sign".

## R4. Reuse of the extension's signing path

- **Decision**: translate each MWA payload into the existing `DAppApprovalRequest` shapes and call the existing `approveSolana*` functions unchanged.
  - signAndSend → `{method:'signAndSendTransaction', params:{message: bs58(messageBytes), transaction: bs58(wire)}}` — keeps co-signer signatures and the byte-identity check.
  - signTransactions → `{method:'signAllTransactions', params:{messages}}`, then the returned signature is placed into the dApp's original wire transaction by a new **pure** helper (`withSignature(wire, address, signature)`) so other signatures survive. `serializeSignedTransactionFromApproval` is not used here because it rebuilds from the message with empty signatures, dropping co-signers.
  - signMessages → `approveSolanaSignMessage` per payload (keeps `isTransactionLookalike` and SIWS-text binding).
  - authorize with `signInPayload` → `approveSolanaSignIn` (fields map 1:1 to `SolanaSignInInputFields`).
- **Rationale**: no new code touches a private key; the only new shared logic is encoding and a signature merge.

## R5. Origin and identity

- **Decision**: the origin passed to the approval functions is the `identityUri` the dApp declares (its origin, e.g. `https://jup.ag`). The bridge's `verifyCallingPackage(identityUri)` (Digital Asset Links) checks it; when it does not verify — always the case for web dApps opened in a browser, whose calling package is the browser — the screen shows the existing `showOriginWarning`. A request without `identityUri` is refused.
- **Rationale**: MWA has no browser-enforced origin; this is the protocol's identity model. The warning keeps the user informed exactly as the extension does for unverified origins.

## R6. Authorization storage

- **Decision**: reuse `trustedApps` (per network, keyed by domain). `TrustedApp` gets one optional field, `authToken`, holding the random token returned to the dApp as `authorizationScope`. Requests are valid only if domain, network, token and the active account's address all match. Revoking in `TrustedAppsSelector` deletes the entry and so invalidates the token.
- **Rationale**: one list, one revoke path. The extension ignores the new optional field.

## R7. Network

- **Decision**: `solana:mainnet` → `solana-mainnet`, `solana:devnet` → `solana-devnet` (also the legacy cluster names `mainnet-beta`, `devnet`). Anything else is refused. If the requested network is not Salmon's active network, the request is refused with the existing `dapp.network_mismatch` copy, telling the user to switch network in Salmon.
- **Rationale**: the signing account and its RPC are bound to the active network; switching networks from inside a dApp request is out of scope.

## R8. Copy

- **Decision**: reuse the existing `dapp.*` keys (80 keys in EN and ES: connect, sign message, sign in, network mismatch, approve/deny…). New keys only for MWA-specific states (unverified app, watch-only account, too many payloads), written in both languages and flagged for owner review (constitution IV: translations are never guessed).

## R9. Testing tools

- `npx solana-mobile@latest playground` drives a wallet from a test page and streams results (docs.solanamobile.com/cli/playground).
- `fakedapp.apk` from the MWA repo releases.
- Unit: Vitest in `packages/shared` for the translator; Jest in `apps/mobile` for the session hook with the native module mocked.
