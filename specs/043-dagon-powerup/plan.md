# Implementation Plan: Dagon Powerup (devnet preview)

**Branch**: `feat/dev-93-dagon-powerup` (never merged) | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/043-dagon-powerup/spec.md`, research in [research.md](./research.md) (Phase 0 decisions appended there as R1-R14), backend half in `../salmon-wallet-backend/specs/023-dagon-powerup/spec.md` (commit `46fda57`).

## Summary

A mobile-only, devnet-only Home sub-tab `dagon` that drives Dagon's pc-token / pc-swap programs (Activate, Hide, Reveal, Send, Swap, Withdraw) through the existing generic build route, plus one narrow core capability: core generates the fresh co-signer keys (and, for a reveal, an off-chain viewer key) on the device, hands the Powerup only public keys, refuses any build whose signer set is not exactly {user} plus those keys, signs everything after the blockhash swap in one step, and discards the keys. The Powerup never touches a key; the backend signs nothing.

The core work is additive: every new behaviour sits behind an argument or an optional field that no existing caller passes, so the existing send, swap, NFT and dApp signing paths run the same code and their test files stay byte-for-byte unchanged (proof in §Core changes).

## Technical Context

**Language/Version**: TypeScript ~5.9 (`packages/shared/package.json`), React Native / Expo (`apps/mobile`), Node 24.21.0 (`apps/mobile/eas.json` `build.base.node`).

**Primary Dependencies**: already installed only. `@solana/kit` 8.4.0 (`generateKeyPairSigner`, `getAddressEncoder`, `getProgramDerivedAddress`, compiled-message codecs), `@solana/webcrypto-ed25519-polyfill` on Hermes (`apps/mobile/index.js:113`), i18next. **No new dependency** (checked `packages/shared/package.json:15-45`, `apps/mobile/package.json`): the executor call is a hand-written unary gRPC-web request over `fetch` + `arrayBuffer()` (research R7), so neither `@protobuf-ts/*` nor `@encrypt.xyz/*` is added.

**Storage**: `usePowerupState('dagon', …)` only (`packages/shared/src/hooks/usePowerupState.ts:85`), keyed per `${publicKey}:${networkId}` inside the slice (the Payments convention, `docs/POWERUPS-UI.md` §2). Public addresses and revealed mock balances only; never a private key.

**Testing**: Vitest for `packages/shared` (core + Powerup logic), Jest for `apps/mobile` (screen), ESLint fixture test `packages/shared/src/powerups/boundary.test.ts`. Manual iPhone-simulator walkthrough against devnet and an EAS `staging` build last (not run in this phase).

**Target Platform**: iOS, EAS `staging` profile only (`apps/mobile/eas.json`: `distribution: internal`, `channel: staging`, `EXPO_PUBLIC_SALMON_ENV=staging`, `EXPO_PUBLIC_POWERUPS=on`). Solana devnet only.

**Project Type**: pnpm + turbo monorepo; shared logic in `packages/shared`, RN surface in `apps/mobile`. No DOM twin (recorded exception).

**Performance Goals**: settlement detected within one 1.5 s poll of the executor committing; every operation reaches "done" or "outcome unknown" within 90 s (180 s for the withdraw decryption) of confirmation (SC-001).

**Constraints**: no key outside core memory; no reveal without an explicit confirmation; no store / TestFlight / production channel; JS-only (no native change, so `app.json` version and the fingerprint baseline stay as they are).

**Scale/Scope**: one Powerup, eight build actions, two mock tokens, a handful of team wallets for a three-day event.

## Constitution Check

_GATE: evaluated before Phase 0 and again after Phase 1._

| Principle | Status | How |
| --- | --- | --- |
| I. Ownership boundaries | Pass | Logic in `packages/shared/src/powerups/dagon/` and `packages/shared/src/core/`; RN surface in `apps/mobile`; nothing in `packages/ui`. |
| II. Shared code has consumers | Pass | Consumers of every touched core export listed in §Core changes (grep of `assertSolanaTransactionMatches`, `signAndSendSolanaTransaction`, `signProposal`, `SignatureRequestProvider`, `SignedResult`). Barrels keep every existing name; additions only. Backend contract checked against `../salmon-wallet-backend/specs/023-dagon-powerup/spec.md`. |
| III. Wallet safety (NON-NEGOTIABLE) | Pass with sign-off | Touches the signing path (`core/broadcast`, `core/signing`, `core/verify`, `core/confirmation`). The owner signed off on the design (spec D9, research "Adopted design", 2026-10-30). Mitigations: additive branches only, unchanged existing tests, new refusal tests (FR-045, SC-004/005), `security-reviewer` + `web3-security-review` before the demo build. No key is logged, persisted or returned. No irreversible on-chain action runs autonomously: devnet transactions in the walkthrough are confirmed by a human. |
| IV. Bilingual strings | Pass, gated | Every string under `dagon.*` in `locales/en.json` + `locales/es.json`; the agent proposes ES, the owner approves EN and ES before the build (D6, FR-005). `pnpm check:i18n` covers the folder once registered in `scripts/check-i18n.mjs` `POWERUP_LOCALES`. |
| V. Functional before visual | Pass | Every phase is test-first in the owning package; one Jest test for the screen; the device walkthrough is manual and last. |
| VI. Ask rather than guess | Pass | Spec Q1-Q4 answered by the supervisor (recorded below); remaining points carry defaults in §Open points. |
| Platform constraints | Pass | JS-only; no `app.json`, plugin or native change. |
| Quality gates | Pass, planned | typecheck, lint (0 errors / 0 warnings), tests, parity, i18n, no-secrets, Powerups-off bundle check in Phase 9. |

**Recorded exceptions (supervisor, 2026-10-30)**

- **Q1, what core owes** (AGENTS.md "Starting a new Powerup" step 3): waived for this never-merged devnet branch. Hidden mock balances exist on chain whether or not the Powerup is on; no core surface shows them. Revisit before any mainnet discussion.
- **`docs/POWERUPS-UI.md` §3.3** ("no new `MOBILE_ONLY` entry"): exception for this branch. `DagonScreen` is listed in `scripts/check-dom-parity.mjs` `MOBILE_ONLY` (line 108) with the reason "devnet preview for the Breakpoint demo" (FR-003).
- **Q2** permissions `['address', 'balances']`. **Q3** withdraw persists `burnedCt`'s public address after step 1 and `requestAcct`'s after step 2. **Q4** switches are build-time constants in `powerups/dagon/constants.ts`.
- `core/broadcast/solana.ts:58-60` claims a co-signer's prepared signature "survives"; it cannot, because lines 104-110 replace the blockhash before signing and invalidate any signature made over the old message. The comment is corrected as part of Phase 3.

Post-design re-check: unchanged, all pass. The one design-level deviation from the spec's wording (settlement by poll only, no account subscription) is recorded as research R9 and open point O1.

## Core changes (security-sensitive)

Exactly these core files change. Nothing else under `core/`, `crypto/`, `storage/` or `blockchain/` changes.

| File | Change | Why existing paths are unchanged |
| --- | --- | --- |
| `packages/shared/src/core/verify/solana-transaction.ts` | `SolanaTransactionExpectation` gains `coSigners?: readonly string[]`. In `assertSolanaTransactionMatches` (line 728), right after the fee-payer check (736-741): when `coSigners` is defined, refuse unless `message.header.numSignerAccounts === 1 + coSigners.length` and `staticAccounts.slice(1, numSignerAccounts)` equals the set of `coSigners` with no duplicates. `DeclaredTransactionEffects` (line 118) becomes `Omit<…, 'feePayer' \| 'coSigners'>`, so a Powerup's `expect` cannot state it. | The branch runs only when `coSigners !== undefined`. No existing caller sets it: `core/broadcast/solana.ts:85`, `blockchain/solana/prepared-transactions.ts:274`, `core/signing/index.ts:29`. `solana-transaction.test.ts` and `swap-effects.test.ts` stay untouched. |
| `packages/shared/src/core/broadcast/solana.ts` | `SolanaBroadcastOptions` (line 40) gains `coSigners?: readonly TransactionPartialSigner[]`. After the blockhash swap (104-110), fold `signTransactionWith` (`blockchain/solana/signing.ts:33`) over each co-signer, then sign with `account.signer` exactly as line 112 does today. The comment at 58-60 is rewritten to describe this truthfully. | `options.coSigners ?? []` is empty for every existing caller, so the same `signTransactionWith(account.signer, …)` call receives the same message. `solana.test.ts` and `solana-swap.test.ts` stay untouched. |
| `packages/shared/src/core/signing/index.ts` | `signProposal(account, proposal, coSigners?)`: when `coSigners` is given, the expectation is `{ feePayer, ...proposal.expect, coSigners: addresses }` (core's field after the spread, so `expect` cannot override it) and the signers are passed to `signAndSendSolanaTransaction`'s options. | Without the third argument it builds the identical object and call as lines 29-32. `SignProposalFn` keeps its first two parameters, so the provider's test seam compiles as is. `signing/index.test.ts` untouched. |
| `packages/shared/src/core/signing/fresh-signers.ts` (new) | `MAX_FRESH_SIGNERS = 1`; `generateFreshSigners(count)` → `generateKeyPairSigner()` per key (non-extractable `CryptoKey`); `encodeReadMessage(ciphertext)` → 43 bytes `[0, 32, …32-byte id, 0, 0×8]` (research R6); `signReadMessage(viewer, ciphertext)` → `{ message, signature, signer }` through `signBytesWith` (`blockchain/solana/signing.ts:90`). | New file. It lives under `core/signing/**`, which the boundary lint already forbids to `powerups/**` (`eslint.config.js:232-233`), so a Powerup cannot import the generator. |
| `packages/shared/src/core/confirmation/types.ts` | Additive: `FreshSignatureRequest`, `FreshSignerKeys`, `ReadAuthorization`, `SignedResult.readAuthorization?`, `FreshSignersRefusedError` (message `transaction.errors.buildFailed`, an existing key, plus a `reason`). | Additive types only; `SignedResult` keeps `signature`. |
| `packages/shared/src/core/confirmation/SignatureRequestContext.tsx` | Provider prop `freshSigning?: { powerupIds: readonly string[]; networkId: string \| null }` (default `undefined` = capability off). Context gains `requestFreshSignature(request)` and the hook `useRequestFreshSignature()`. `ParkedRequest` (line 92) gains `fresh?: { signers, viewer?, ciphertext? }`. `confirm` (150-214) passes `parked.fresh.signers` to `signProposal` and, for a viewer, signs the read message right after confirmation; keys are dropped on success, on unknown outcome, on cancel (`settle`, 131-135) and when the build or the pre-park check throws. | `requestSignature` (137-148) is untouched, so a parked request without `fresh` follows the same `confirm` path with `signProposal(signer, proposal)` exactly as line 164 does. `SignatureRequestContext.test.tsx` and `.outcome.test.tsx` stay untouched. The extension mounts the provider without the prop (`apps/extension/src/entrypoints/popup/App.tsx:611`), so the capability is off there. |
| `packages/shared/src/core/confirmation/index.ts` | Export the new hook, types and error. | Existing exports unchanged. |

App wiring outside `core/` (not signing code): `apps/mobile/app/(app)/_layout.tsx:156` passes `freshSigning={{ powerupIds, networkId }}`, where `powerupIds` is `POWERUPS.filter((m) => m.freshSigners).map((m) => m.id)` from the aliased mobile entry (`apps/mobile/src/powerups/index.ts:14-21`). A Powerups-off build aliases `POWERUPS` to `[]` (`packages/shared/src/powerups/index.off.ts:19`), so the capability refuses everything there.

**How "unchanged" is proven**: (1) the existing core test files listed above, plus `blockchain/solana/signing.test.ts`, `prepared-transactions` tests and the dApp approval tests, are run before and after and must pass with `git diff --stat` showing them unmodified; (2) all new behaviour is tested in new files (`solana-transaction.cosigners.test.ts`, `solana.cosigners.test.ts`, `fresh-signers.test.ts`, `SignatureRequestContext.fresh.test.tsx`); (3) one new test feeds a two-signer transaction through the existing `signAndSendSolanaTransaction` without `coSigners` and asserts the bytes signed are the same as before the change (the co-signer slot stays empty, as today).

**Order of checks in `requestFreshSignature`** (each refusal rejects with `FreshSignersRefusedError` before any key exists, except where noted):

1. A request already parked → reject `transaction.errors.confirmationBusy`, as `requestSignature` does (line 141).
2. `powerupId` not in `freshSigning.powerupIds` → refuse (`undeclared`).
3. `request.networkId` or `freshSigning.networkId` is not `solana-devnet` → refuse (`network`). FR-040, SC-004.
4. `count` not an integer in `0..MAX_FRESH_SIGNERS`, or `viewer` with `count !== 1` → refuse (`count`).
5. No signing account (watch-only) → `NoSigningAccountError`; no key generated.
6. Generate the keys; call `request.build({ freshSigners, viewer })`. A throw drops the keys and rethrows the Powerup's own error unchanged (so `describePowerupBuildError` still maps it).
7. Check the built proposal before parking: same `networkId`; `assertSolanaTransactionMatches` with `{ feePayer: account address, ...proposal.expect, coSigners }` (fee payer, exact signer set, programs). A mismatch drops the keys and rejects with that error. FR-042.
8. Park with `fresh` attached; `refresh` is core's own closure that re-runs `build` with the same keys and step 7.

At confirm: re-check that the active network is still `solana-devnet` (a wallet switch mid-review refuses and drops the keys); sign the fresh keys and the user in one `signAndSendSolanaTransaction` call after the blockhash swap; for a viewer, sign the read message for `freshSigners[0]` (the `viewCt` the reveal created, GUIDE §5 step 6) with the viewer key; drop every key; resolve `SignedResult { signature, readAuthorization? }` on receipt dismissal as today. A retryable failure keeps the parked request and its keys for the retry, as the existing path keeps the proposal (lines 207-212); they are dropped when the user backs out.

## Project Structure

### Documentation (this feature)

```text
specs/043-dagon-powerup/
├── spec.md
├── research.md          # spike + Phase 0 decisions (R1-R14 appended)
├── plan.md              # this file
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── core-fresh-signers.md
│   ├── dagon-build.md
│   └── encrypt-executor-and-config.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks, not this phase
```

### Source Code (repository root)

```text
eslint.config.js                                     # boundary: +generateKeyPairSigner, generateKeyPair, signBytes (+ @solana/keys, @solana/signers)
packages/shared/src/
├── core/
│   ├── verify/solana-transaction.ts                 # coSigners exact-signer check
│   ├── verify/solana-transaction.cosigners.test.ts  # new
│   ├── broadcast/solana.ts                          # sign co-signers after blockhash swap; comment fix
│   ├── broadcast/solana.cosigners.test.ts           # new
│   ├── signing/index.ts                             # signProposal 3rd param
│   ├── signing/fresh-signers.ts                     # new: keygen, read message
│   ├── signing/fresh-signers.test.ts                # new
│   └── confirmation/{types.ts,index.ts,SignatureRequestContext.tsx}
│       └── SignatureRequestContext.fresh.test.tsx   # new
└── powerups/
    ├── manifest.ts                                  # + freshSigners?: boolean
    ├── registry.ts                                  # + dagonManifest in MANIFESTS (line 21)
    ├── index.ts                                     # + export * from './dagon'
    ├── locales.ts                                   # + dagon namespace
    ├── boundary.test.ts                             # + fixtures for the new lint targets
    ├── payments/usePaymentsScreenLogic.ts           # one eslint-disable line with reason (R11)
    └── dagon/
        ├── manifest.ts
        ├── constants.ts          # pinned ids, URLs, caps, switches
        ├── config.ts             # devnet.json fetch + validation
        ├── chain.ts              # PDAs, positions, public balances, settlement predicate
        ├── executor.ts           # ReadCiphertext over fetch, strict u64 decode
        ├── operations.ts         # state slice, reducers, confirmation display, fee row
        ├── useDagonScreenLogic.ts
        ├── index.ts
        ├── locales/{en,es}.json
        └── *.test.ts(x)          # config, chain, executor, operations, hook
apps/mobile/
├── app/(app)/_layout.tsx                            # freshSigning prop
├── src/powerups/index.ts                            # getPowerupTab('dagon')
├── src/screens/DagonTab.tsx
└── src/components/DagonScreen/{index.ts,types.ts,DagonScreen.tsx,DagonActionSheet.tsx,DagonScreen.test.tsx}
scripts/
├── check-dom-parity.mjs        # MOBILE_ONLY.DagonScreen
├── check-powerups-bundle.mjs   # MARKERS += 'dagon.catalog'
└── check-i18n.mjs              # POWERUP_LOCALES += dagon
```

**Structure Decision**: the Powerup follows `docs/POWERUPS-UI.md` §2 (one folder in shared, one tab file and one component folder on mobile, the three registrations). No `packages/ui` page and no `types/ui/dagon-screen.ts` contract: with no twin there is nothing to share a `PropsBase` with (R12). No new folder outside `powerups/dagon/` and `core/signing/`.

## Design per area

**Boundary (FR-046).** `eslint.config.js:248-266` lists restricted `@solana/kit` names; add `generateKeyPairSigner`, `generateKeyPair`, `signBytes`, and two more `paths` entries, `@solana/keys` (`generateKeyPair`, `signBytes`, `createKeyPairFromBytes`, `createKeyPairFromPrivateKeyBytes`) and `@solana/signers` (`generateKeyPairSigner`, `createKeyPairSignerFromBytes`, `createKeyPairSignerFromPrivateKeyBytes`). Payments imports `generateKeyPair` for its Solana Pay reference (`powerups/payments/usePaymentsScreenLogic.ts:15`, used at 152-156, private half discarded): it gets one `eslint-disable-next-line no-restricted-imports` with the reason, so its behaviour is unchanged (R11).

**Config (FR-010, FR-011).** `config.ts` fetches `CONFIG_URL` with plain `fetch` and `parseDagonConfig` refuses: non-object; `cluster !== 'devnet'`; `programs.encrypt/pcToken/pcSwap` not the pinned three; `encryptGrpcUrl` not `https://pre-alpha-dev-1.encrypt.ika-network.net[:443]` (so a changed remote file cannot redirect the device's read, mirroring backend FR-014); `sides.USDC/DOGE` missing or `decimals !== 2`; `layout` offsets different from the ones this code reads (`[64,96]`, `[2,34]`, `99`). Refusal = the tab's unavailable `StateBlock` with retry; no cached fallback (spec edge case). `faucetUrl !== null` shows "Get test tokens" as an external link (FR-011).

**Reads (no transaction).** `chain.ts`, through `solanaRpcFor('solana-devnet')` (`blockchain/solana/networks.ts:48`, the read path Payments uses): pc-account PDA `[b"pc_account", pcMint, owner]` under pc-token (GUIDE §2) via kit `getProgramDerivedAddress`; one `getMultipleAccounts` for both pc-accounts (activation state = both exist; `balanceCt = data[64..96]`); public balances via `getTokenAccountsByOwner(owner, { mint: splMint })`; SOL balance for the shortfall check. Settlement predicate `isSettled(snapshotDigest, data)` = digest `data[2..34]` differs from the snapshot AND `data[99] === 1` (GUIDE §2, §8).

**Executor read (FR-052, US3).** `executor.ts` posts one gRPC-web frame (`0x00` ‖ u32 BE length ‖ protobuf) to `${encryptGrpcUrl}/encrypt.v1.EncryptService/ReadCiphertext` with fields 1 `message`, 2 `signature`, 3 `signer` (vendored `encrypt_service.ts`, `ReadCiphertextRequest`, fields 1-3), reads `arrayBuffer()`, splits frames (type `0x00` data, `0x80` trailer) as `spike/probe.mjs:33-51` does, decodes response field 1 `value` (field 2 `fheType`, 3 `digest`), and refuses a non-zero `grpc-status` or a `value` shorter than 8 bytes (FR-031, GUIDE §5 step 6). u64 little-endian decode as `reference/encryptRead.ts:104-113` minus its zero fallback.

**Operations (FR-020..FR-032).** One reducer module over the `usePowerupState` slice (shape in [data-model.md](./data-model.md)). Each action:

1. pre-checks (activation, switch, SOL shortfall, swap's all-zero input digest → "your earlier hide is still being processed", FR-030);
2. snapshots the watched ciphertext digests;
3. calls `requestFreshSignature({ powerupId: 'dagon', networkId, count: FRESH_SIGNERS[action], viewer: action === 'reveal', build })` where `build` calls `buildPowerup('dagon', 'solana-devnet', { publicKey, action, ...params, freshSigners: keys.freshSigners.join(','), viewer? })` (`powerups/backend/api.ts:10`) and maps the envelope with `toPowerupProposal` (`powerups/backend/proposal.ts:33`), `expect: { allowedPrograms: dagonManifest.programs }`, no `pending` (FR-028), and the receipt title "submitted, Encrypt is processing" (FR-025);
4. records the operation in `onOutcome(true)` (fires at confirmation, before the receipt, `SignatureRequestContext.tsx:166`), so an app kill on the receipt keeps it;
5. maps failures: `SolanaOutcomeUnknownError` → clear the form, item "outcome unknown", no resubmit (FR-032, the Memo pattern `useMemoScreenLogic.ts:124-127`); `SignatureRequestCancelledError` → nothing; anything else → `describePowerupBuildError(error, { codes: DAGON_CODES, fallback: 'dagon.errors.buildFailed' })` (`powerups/backend/errors.ts:50`), with Dagon's codes `setup_required`, `recipient_setup_required`, `already_initialized`, `balance_settling`, `receipt_not_found`, `already_requested`, `executor_pending`, `executor_unavailable`, `executor_bad_response`, `invalid_fresh_signers`.

`setup_required` (swap) and `recipient_setup_required` (send) offer the setup as its own confirmation first (`owner` = the output owner / the recipient), then rebuild the original action (FR-053). The watcher polls every 1.5 s while the tab is mounted, resumes on mount for items within their cap measured from submission, and flips to "outcome unknown" at 90 s (180 s for `unwrapDecrypt`). A reveal flips to "read" once `viewCt` settles, then calls the executor with the `readAuthorization` core returned; a failed read keeps the authorization for retry (the signature is deterministic over a fixed message, R5).

**Confirmation display.** Rows built by `operations.ts`: amount and token (2 decimals, FR-012), the swap's minimum and the "devnet does not enforce the minimum yet" warning (FR-030), the reveal's cost ("a transaction and about 0.0023 devnet SOL of rent", FR-023), the public-amount warning for Hide and Withdraw, and a network fee row `5000 × (1 + N)` lamports plus `ceil(priorityFeeMicroLamports × computeUnitLimit / 1e6)` from the envelope (`powerups/backend/types.ts:37-38`, R10).

**Mobile surface.** `DagonTab.tsx` mirrors `PaymentsTab.tsx` (Home's props to the screen). Home draws the usage line (`apps/mobile/app/(app)/(tabs)/index.tsx:176-183`); `DagonScreen` draws, in FR-020 order: `WarningNotice tone="warning"` (devnet notice, always visible, never dismissible), one `FactsCard` per token (public balance; hidden balance with read time / "not revealed yet" / "may be out of date") with a `SecondaryButton` Reveal, the actions as `PrimaryButton`/`SecondaryButton` (first visit: Activate only, FR-021), and a `FactsCard` "In progress" with a `Pill` per state. Each action opens `DagonActionSheet` (`BottomSheetContainer` + `AmountEntryCard` with `useAmountShortcuts` at 2 decimals + `TokenPickerSheet` over the two mock tokens + `TextField` for the recipient + `FactsCard` for facts + `PrimaryButton`). Loading: `SkeletonRow`; config or read failure: `StateBlock tone="error"` with retry; build failure: `WarningNotice tone="error"`. No spinner, no confirm button, no receipt of its own (`docs/POWERUPS-UI.md` §0.3).

## Phases (implementation order, test-first)

Each phase starts with the failing test named, then the smallest code that passes it, then the package's tests. Core before the Powerup.

0. **Prerequisites (no code).** Backend `dagon` adapter on `feat/dev-93-dagon-powerup` in `salmon-wallet-backend`, deployed to staging, availability row iOS-only (backend spec FR-003/FR-004). The client is built against it; nothing here waits on it until Phase 7's hook test against a fake `buildPowerup`.
1. **Boundary lint (FR-046).** Fixtures in `boundary.test.ts` for each new name from `@solana/kit`, `@solana/keys`, `@solana/signers` fail first; add the `eslint.config.js` entries; add the Payments disable line; `pnpm turbo run lint test --filter=@salmon/shared`.
2. **Verify: exact signers (FR-042).** `solana-transaction.cosigners.test.ts`: accepts {payer, k1}; refuses missing, extra, swapped, duplicate key, payer not first, `numSignerAccounts` off by one; a transaction without `coSigners` behaves as before. Then the `coSigners` branch and the `DeclaredTransactionEffects` omission.
3. **Broadcast: one signing step after the blockhash swap (FR-043).** `solana.cosigners.test.ts` with a stub RPC: both signatures verify over the patched message; the fresh blockhash is on the message; no-`coSigners` path produces the same signed bytes as before. Then the options field, the fold, the comment fix (solana.ts:58-60).
4. **Signing: keys and read message (FR-041, FR-044).** `fresh-signers.test.ts`: `count` keys, distinct, non-extractable (`crypto.subtle.exportKey` rejects); `encodeReadMessage` equals the 43-byte layout of `reference/encryptRead.ts:35-62` with `chain 0`, empty key, `epoch 0`, and `spike/probe.mjs:87`; `signReadMessage` signature verifies under the viewer key; `signProposal` with co-signers passes `coSigners` after the `expect` spread.
5. **Confirmation: `requestFreshSignature` (FR-040..FR-045, SC-004, SC-005).** `SignatureRequestContext.fresh.test.tsx`: refuses on `solana-mainnet` before any keygen (spy on `generateFreshSigners`); refuses an undeclared id; refuses a bad count; watch-only → `NoSigningAccountError` with no keys; a build with a wrong or extra signer rejects before parking; the build callback and the resolved value contain no `CryptoKey`, no `KeyPairSigner`, no 64-byte secret; the user signer's `signMessages` is never called; keys are unreachable after cancel, unknown outcome and success (the parked record is cleared); a wallet switch to mainnet between review and confirm refuses. Then the provider code and exports; then the mobile `_layout.tsx` prop. Run the untouched existing core tests.
6. **Manifest and registration.** `manifest.ts` `freshSigners?: boolean`; `dagon/manifest.ts`, `constants.ts`, locale files with the proposed EN/ES copy; registry, barrel, `locales.ts`, `check-i18n.mjs`, `check-powerups-bundle.mjs`. `registry.test.ts` and `disclosure.test.ts` stay green; add one disclosure assertion for the two endpoints.
7. **Powerup logic.** Tests first for `config.ts` (pinned ids, executor host, malformed, `faucetUrl`), `chain.ts` (PDA derivation, `isSettled` both-signals truth table, all-zero digest), `executor.ts` (frame bytes, trailer parsing, grpc-status error, `< 8` bytes error, u64 decode), `operations.ts` (fresh-signer count per action, reducers, caps 90/180 s, per-account keys, withdraw resume from stored addresses, no-reveal-on-render), `useDagonScreenLogic.test.tsx` (fake `buildPowerup` + fake `requestFreshSignature`: setup-first on 409, outcome-unknown clears the form, no `pending` on any proposal, switches hide Send/Withdraw but list an in-progress withdraw). Then the code.
8. **Mobile surface.** `DagonScreen.test.tsx` (first visit shows notice + Activate only; notice present in every state; Reveal disabled while one is in flight; no "private" string in either locale, SC-002). Then `DagonTab.tsx`, `DagonScreen/*`, `getPowerupTab('dagon')` (`apps/mobile/src/powerups/index.ts:48-54`), `MOBILE_ONLY.DagonScreen`.
9. **Gates.** `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/mobile`, `pnpm check:parity`, `pnpm check:i18n`, `pnpm check:no-secrets`, a Powerups-off mobile export plus `pnpm check:powerups-bundle <dist>` (marker `dagon.catalog` absent, SC-008), coverage thresholds unchanged or raised. Then `security-reviewer` and the `web3-security-review` skill on the core diff.
10. **Copy approval.** The owner approves the EN and ES strings (D6, FR-005).
11. **iPhone simulator against devnet (manual, not run in this phase).** Steps in [quickstart.md](./quickstart.md) §3; SC-001's path Activate → Hide → Reveal → Swap → Reveal with a pre-funded team wallet, a human confirming every transaction.
12. **EAS `staging` build (not run in this phase).** `eas build --profile staging --platform ios` from `apps/mobile`, internal distribution to the team's registered iPhones; never `production`, never `eas submit` (FR-001, D2).

## Open points with defaults

| # | Point | Default |
| --- | --- | --- |
| O1 | FR-052 says "account-change subscription plus a ~1.5 s poll". No subscription helper exists in shared (only `solanaRpcFor`, `networks.ts:48`), Payments watches by polling, and GUIDE §8 says subscriptions alone are unreliable on devnet and the public RPC rate-limits subscription + poll. | Poll only: one `getMultipleAccounts` for every watched ciphertext every 1.5 s while the tab is mounted. Add the subscription only if the walkthrough shows settlement lag. |
| O2 | Maximum fresh signers per proposal. | `MAX_FRESH_SIGNERS = 1`, the largest count any action declares (spec FR-051; backend open question 2 keeps swap at 1). |
| O3 | Viewer key lifetime. FR-044 says discard "after the read". | Discard right after core signs the read message at confirmation, before the executor call. The Powerup holds only `{ message, signature, signer }`; stricter than the spec. |
| O4 | Read retries. | Reuse the same signature: ed25519 is deterministic and the message is fixed, so a retry needs no key and no new transaction. A second reveal (new transaction) only after a 180 s failure. |
| O5 | Swap minimum. | `minAmountOut = amountIn × 0.99` at the 1:1 indicative price GUIDE §7 prescribes for the toy pool; shown as a row with the "not enforced on devnet yet" caveat; no user input for the tolerance. |
| O6 | SOL shortfall threshold. | Refuse below 0.01 devnet SOL with a message naming the shortfall; rent per action is not documented beyond the reveal's ~0.0023. |
| O7 | Catalogue icon. | `Stack` from `PowerupIconName` (`types/ui/powerup-icon.ts:14-27`): no privacy connotation, so no kit PR. |
| O8 | Withdraw step 3 readiness. The decryption-request layout lives in the Encrypt SDK, not in the vendored sources (`pc-token/lib.rs:760-761` reads it through `accounts::read_decrypted_verified`). | No on-chain watch for step 2. "Complete" is offered once step 2 confirms; a build that fails simulation reads "decryption not posted yet, try again"; after 180 s the item is "outcome unknown" and Complete stays offered. Ask the backend for a `409 decryption_pending` if the walkthrough needs it. |
| O9 | Network fee row. | Computed client-side from the envelope (R10); omitted when the envelope lacks the priority fields. |
| O10 | The backend's "outcome known only after a reveal" flag has no fixed name yet (backend FR-024). | The client does not branch on it: every Dagon receipt already uses the "submitted, Encrypt is processing" copy (FR-025), which honours the flag whatever its name. |
| O11 | Payments imports `generateKeyPair` (`usePaymentsScreenLogic.ts:15`), which FR-046 blocks. | One `eslint-disable-next-line` with the reason; no behaviour change. Moving the reference generation into core is the cleaner fix if this branch ever merges. |
| O12 | `types/ui/dagon-screen.ts` contract. | None: no DOM twin to share it with; props live in `apps/mobile/src/components/DagonScreen/types.ts`. |
| O13 | How long finished items stay in "In progress". | Keep the newest 10 per account and network; "done" and "outcome unknown" items stay until pushed out. |
| O14 | Analytics. | No event. Backend FR-005 accepts `dagon` should one be added later. |
| O15 | `signProposal` puts `feePayer` before the `expect` spread (`core/signing/index.ts:29-32`), so a runtime `expect.feePayer` could override it (types forbid it). Existing behaviour, out of scope. | Left as is on this branch; the new `coSigners` field is placed after the spread. Flag for the main line. |

## Risks

| Risk | Mitigation |
| --- | --- |
| A change on the signing path loses funds or signs something unintended. | Additive branches only; existing tests untouched; exact-signer check before the screen and again at broadcast; devnet-only and declared-id gates before any key exists; security review in Phase 9; branch never merged. |
| Ed25519 key generation and signing with a non-extractable key on Hermes. Payments already generates keys on mobile (`usePaymentsScreenLogic.ts:154`) through the polyfill (`apps/mobile/index.js:113`), but nothing signs with a generated key on device today. | The first simulator step (Phase 11) is an Activate, which exercises it; fallback is `generateKeyPairSigner(true)` only if the polyfill refuses non-extractable signing, recorded as a finding. |
| Backend emits legacy instead of v0 (backend FR-028). | The kit compiled-message decoder and encoder used at `solana.ts:101-110` handle both versions; the cosigners test covers a legacy message too. |
| Executor drops (5 in 50 measured), floor not enforced, transfer unverified. | "Outcome unknown" at the cap, never "failed" or "succeeded"; Send and Withdraw off; copy states the floor caveat. |
| `devnet.json` changes pool or epoch mid-event. | Runtime fetch on mount; refusal only on pinned-id or executor-host mismatch. |
| Public devnet RPC rate limits. | One batched poll per tick, only while mounted, only for items within their cap. |
| A Powerup passes another Powerup's id to `requestFreshSignature`. | The id gate is declaration-level, like the manifest's `permissions`; the real boundary is the lint plus review of every `powerups/**` PR. Recorded, not engineered further. |
| Revealed mock balances sit in plain text in `POWERUP_STATE`. | Worthless devnet mocks; the same seam every Powerup uses; nothing secret. |
