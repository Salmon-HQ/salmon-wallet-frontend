# Tasks: Dagon Powerup (devnet preview)

**Input**: `specs/043-dagon-powerup/` (plan.md, spec.md, research.md, data-model.md, contracts/core-fresh-signers.md, contracts/dagon-build.md, contracts/encrypt-executor-and-config.md, quickstart.md)

**Tests**: required by the constitution (V) and the plan: every phase starts with its failing test, then the smallest code that passes it, then the package's tests. Runners: `packages/shared` Vitest, co-located (`@vitest-environment jsdom` for hooks and providers); `apps/mobile` Jest + `@testing-library/react-native`; ESLint fixture test `packages/shared/src/powerups/boundary.test.ts`. Signing edits read the repo's security context first.

**Order**: plan.md §Phases 0-12, exactly; core (Phases 1-5) before the Powerup (Phases 6-8). Branch `feat/dev-93-dagon-powerup`, never merged (FR-001, D1). Each code phase ends green on `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/mobile` (zero warnings).

**Unchanged-path rule (FR-045, SC-004)**: these existing test files are never edited on this branch; each core phase runs them and Phase 9 proves them byte-for-byte unchanged:
`packages/shared/src/core/verify/solana-transaction.test.ts`, `packages/shared/src/core/verify/swap-effects.test.ts`, `packages/shared/src/core/broadcast/solana.test.ts`, `packages/shared/src/core/broadcast/solana-swap.test.ts`, `packages/shared/src/core/signing/index.test.ts`, `packages/shared/src/core/confirmation/SignatureRequestContext.test.tsx`, `packages/shared/src/core/confirmation/SignatureRequestContext.outcome.test.tsx`, `packages/shared/src/blockchain/solana/signing.test.ts`, `packages/shared/src/blockchain/solana/prepared-transactions.test.ts`, `packages/shared/src/blockchain/solana/prepared-transactions.golden.test.ts`, `packages/shared/src/blockchain/solana/prepared-transactions.outcome.test.ts`, `packages/shared/src/utils/dapp-approval.test.ts`, `packages/shared/src/types/dapp-approval.test.ts`.

**Supervisor decisions applied (2026-10-30)**: O1 poll only (no subscription); O2 `MAX_FRESH_SIGNERS = 1`; O3 viewer key discarded right after core signs the read message; O4-O7, O9, O10, O12-O14 defaults; O8 no backend change, `422 simulation_failed` on `unwrapComplete` reads "decryption not posted yet, try again", cap 180 s; O11 one `eslint-disable-next-line` in Payments with its reason; O15 main-line follow-up, no task. Local QA is manual on the Android emulator: backend in Docker (`docker compose up`, stage `local`, host port 3000, reached from the emulator at `http://10.0.2.2:3000/local`), app built locally with `EXPO_PUBLIC_SALMON_ENV=local`, no Maestro. No staging for now; the iOS EAS `staging` build (Phase 12) is optional and runs only if the owner asks for it.

## Format: `[ID] [P?] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task).
- **OWNER**: an action only the owner (or the backend session) performs; the agent prepares and waits.
- **GATE**: blocks the phase named in it.
- Phases follow plan.md, not user stories, so tasks carry no `[USn]` label; each names the FR/SC (and user story where useful) it satisfies.

## Phase 0: Prerequisites (no code)

**Purpose**: cross-repo and owner prerequisites. Nothing in Phases 1-10 waits on them; Phase 11 does (T003 and T005 only matter for the optional Phase 12).

- [ ] T001 **OWNER (backend session)** Backend `dagon` adapter on `feat/dev-93-dagon-powerup` in `salmon-wallet-backend` (spec 023), its test suite green; contract as in `specs/043-dagon-powerup/contracts/dagon-build.md` (FR-050, FR-051, FR-053). **GATE** for Phase 11
- [ ] T002 **OWNER (backend session)** The backend's `local` stage offers `dagon` on Android: the backend plan's availability row gives Android `maintenance` and the gate answers 404, which blocks the Android QA. Probe, with `docker compose up` running: `curl -s -H 'X-Salmon-Platform: android' 'http://localhost:3000/local/v1/solana-devnet/powerups/availability'` shows `dagon` enabled. **GATE** for Phase 11
- [ ] T003 **OWNER, optional (only if the owner asks for the iOS build)** Backend deployed to the staging stack with `dagon` enabled for `staging` and the availability row iOS-only; the quickstart §1 staging probe answers an envelope or `409 already_initialized` (FR-001). **GATE** for Phase 12
- [ ] T004 [P] **OWNER** Funded QA wallets: two team wallets (the second is the Send recipient) with devnet SOL from the public faucet and 1000 mock-USDC + 1000 mock-DOGE from Dagon (D8, 4 h cooldown). **GATE** for Phase 11
- [ ] T005 [P] **OWNER, optional (only with T003)** Device registration: the team's demo iPhones registered for EAS internal distribution (`eas device:create` from `apps/mobile`). **GATE** for Phase 12

## Phase 1: Boundary lint (FR-046, SC-006)

- [X] T006 Failing fixtures in `packages/shared/src/powerups/boundary.test.ts`: a file under `powerups/**` importing each of `generateKeyPairSigner`, `generateKeyPair`, `signBytes` from `@solana/kit`; `generateKeyPair`, `signBytes`, `createKeyPairFromBytes`, `createKeyPairFromPrivateKeyBytes` from `@solana/keys`; `generateKeyPairSigner`, `createKeyPairSignerFromBytes`, `createKeyPairSignerFromPrivateKeyBytes` from `@solana/signers` fails `no-restricted-imports`. Run it and see it fail (FR-046, SC-006)
- [X] T007 Add the names to the restricted `@solana/kit` list and two `paths` entries for `@solana/keys` and `@solana/signers` in `eslint.config.js` (lines 248-266) until T006 passes (FR-046)
- [X] T008 One `eslint-disable-next-line no-restricted-imports` with its reason (Solana Pay reference key, private half discarded; plan O11) above the `generateKeyPair` import in `packages/shared/src/powerups/payments/usePaymentsScreenLogic.ts:15`; no behaviour change (FR-046)
- [X] T009 `pnpm turbo run lint test --filter=@salmon/shared`: zero errors, zero warnings; Payments tests unchanged and green

## Phase 2: Verify, exact signer set (FR-042)

- [ ] T010 Failing tests in `packages/shared/src/core/verify/solana-transaction.cosigners.test.ts` (new): with `coSigners: [k1]` accepts {payer, k1}; refuses k1 missing, an extra signer, k1 swapped for another key, a duplicate key, payer not first, `numSignerAccounts` off by one in either direction; a legacy message gets the same answers; an expectation without `coSigners` accepts the same two-signer transaction it accepts today; a `@ts-expect-error` proves `DeclaredTransactionEffects` cannot state `coSigners` or `feePayer` (FR-042, SC-004)
- [ ] T011 Implement in `packages/shared/src/core/verify/solana-transaction.ts`: `SolanaTransactionExpectation.coSigners?: readonly string[]`; in `assertSolanaTransactionMatches` (line 728), right after the fee-payer check (736-741), the exact-set check that runs only when `coSigners !== undefined`; `DeclaredTransactionEffects` (line 118) becomes `Omit<…, 'feePayer' | 'coSigners'>` (FR-042)
- [ ] T012 Run `solana-transaction.test.ts` and `swap-effects.test.ts` untouched; `pnpm turbo run typecheck test --filter=@salmon/shared` green (FR-045)

## Phase 3: Broadcast, one signing step after the blockhash swap (FR-043)

- [ ] T013 Byte-identical test first, in `packages/shared/src/core/broadcast/solana.cosigners.test.ts` (new), written and passing BEFORE any change to `solana.ts`: a two-signer transaction (payer + an unsigned co-signer slot) through the existing `signAndSendSolanaTransaction` without `coSigners`, stub RPC with a fixed blockhash; snapshot the exact bytes sent (co-signer slot stays empty). This snapshot is the proof that the existing path is unchanged (FR-045, SC-004)
- [ ] T014 Failing tests in the same file: with `coSigners: [k1]`, the message carries the fresh blockhash from the stub, both signatures verify over the patched message, the user signer is called after the blockhash swap and never before, a legacy message works the same (FR-043)
- [ ] T015 Implement in `packages/shared/src/core/broadcast/solana.ts`: `SolanaBroadcastOptions.coSigners?: readonly TransactionPartialSigner[]` (line 40); after the blockhash swap (104-110) fold `signTransactionWith` (`blockchain/solana/signing.ts:33`) over `options.coSigners ?? []`, then sign with `account.signer` exactly as line 112; rewrite the comment at 58-60 to say a co-signer signs after the swap. T013's snapshot still matches (FR-043, FR-045)
- [ ] T016 Run `solana.test.ts`, `solana-swap.test.ts`, `blockchain/solana/signing.test.ts` and the three `prepared-transactions*.test.ts` untouched; shared tests green (FR-045)

## Phase 4: Signing, keys and read message (FR-041, FR-044)

- [ ] T017 Failing tests in `packages/shared/src/core/signing/fresh-signers.test.ts` (new): `MAX_FRESH_SIGNERS === 1`; `generateFreshSigners(n)` returns `n` distinct signers whose private keys are non-extractable (`crypto.subtle.exportKey` rejects); `encodeReadMessage(ct)` equals the 43-byte layout `[0, 32, …32-byte id, 0, 0×8]` of `reference/encryptRead.ts:35-62` and `spike/probe.mjs:87`; `signReadMessage(viewer, ct)` returns `{ message, signature, signer }` whose signature verifies under `signer`; `signProposal(account, proposal, [k1])` passes `coSigners: [k1.address]` after the `expect` spread (an `expect` carrying `coSigners` at runtime cannot override it) and passes the signers to `signAndSendSolanaTransaction` (FR-041, FR-044)
- [ ] T018 Implement `packages/shared/src/core/signing/fresh-signers.ts` (new): `MAX_FRESH_SIGNERS`, `generateFreshSigners`, `encodeReadMessage`, `signReadMessage` through `signBytesWith` (`blockchain/solana/signing.ts:90`) (FR-041, FR-044)
- [ ] T019 Implement the optional third parameter `coSigners?` of `signProposal` in `packages/shared/src/core/signing/index.ts`; without it the object and call are identical to lines 29-32; `SignProposalFn` keeps its first two parameters (FR-043, FR-045)
- [ ] T020 Run `core/signing/index.test.ts` untouched; shared tests green (FR-045)

## Phase 5: Confirmation, `requestFreshSignature` (FR-040..FR-045, SC-004, SC-005)

- [ ] T021 Failing tests in `packages/shared/src/core/confirmation/SignatureRequestContext.fresh.test.tsx` (new), with a spy on `generateFreshSigners`: provider without `freshSigning` refuses `undeclared`; a request while another is parked rejects `confirmationBusy`; undeclared id refuses; `solana-mainnet` (request or provider network) refuses `network`; `count` 2, -1, 1.5 and `viewer` with `count 0` refuse `count`; watch-only rejects `NoSigningAccountError`; in all of these the spy was never called. A build that throws rejects with the Powerup's own error. A build with a wrong signer, an extra signer, a different fee payer, another network or a program outside `expect.allowedPrograms` rejects `SolanaTransactionMismatchError` before parking. Cancel rejects `SignatureRequestCancelledError`; a network switch to mainnet between review and confirm refuses `network`; unknown outcome rejects `SolanaOutcomeUnknownError` on close; a retryable failure keeps the request parked for the retry. After confirm, the result is `{ signature, readAuthorization? }`, with `readAuthorization` only for `viewer: true`, its `message` naming `freshSigners[0]`. Key-leak guarantees: the build argument and the resolved value contain no `CryptoKey`, no `KeyPairSigner`, no 64-byte secret (deep walk); the user signer's `signMessages` is never called; nothing is written to storage and nothing key-shaped reaches `console.*` (spies); the parked record is cleared after success, cancel, unknown outcome and refusal; `refresh` rebuilds with the same public keys (FR-040, FR-041, FR-042, FR-043, FR-044, SC-004, SC-005)
- [ ] T022 Add to `packages/shared/src/core/confirmation/types.ts`: `FreshSignatureRequest`, `FreshSignerKeys`, `ReadAuthorization`, `SignedResult.readAuthorization?`, `FreshSignersRefusal`, `FreshSignersRefusedError` (message `transaction.errors.buildFailed`, `reason`), per `contracts/core-fresh-signers.md` (FR-040, FR-044)
- [ ] T023 Implement in `packages/shared/src/core/confirmation/SignatureRequestContext.tsx`: provider prop `freshSigning?`, `requestFreshSignature` with the eight-step check order of plan §Core changes, `ParkedRequest.fresh`, `confirm` passing `parked.fresh.signers` to `signProposal`, the network re-check at confirm, the viewer signing the read message right after confirmation and being dropped at once (O3), keys dropped on success, unknown outcome, cancel, build throw and pre-park refusal; `requestSignature` (137-148) untouched (FR-040..FR-044)
- [ ] T024 Export `useRequestFreshSignature`, the new types and `FreshSignersRefusedError` from `packages/shared/src/core/confirmation/index.ts`; existing exports unchanged
- [ ] T025 Add the optional `freshSigners?: boolean` to `PowerupManifest` in `packages/shared/src/powerups/manifest.ts` (pulled forward from Phase 6 because T026 reads it), then pass `freshSigning={{ powerupIds, networkId }}` in `apps/mobile/app/(app)/_layout.tsx:156`, `powerupIds = POWERUPS.filter((m) => m.freshSigners).map((m) => m.id)` from `apps/mobile/src/powerups/index.ts`; the extension's provider (`apps/extension/src/entrypoints/popup/App.tsx:611`) stays without the prop (FR-040)
- [ ] T026 Run `SignatureRequestContext.test.tsx` and `SignatureRequestContext.outcome.test.tsx` untouched, plus the dApp approval tests; `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/mobile` green (FR-045)

**Checkpoint**: core capability done and proven before any Powerup code exists.

## Phase 6: Manifest and registration (FR-002, FR-003, FR-004, FR-005)

- [ ] T027 Failing tests: in `packages/shared/src/powerups/dagon/manifest.test.ts` (new) the manifest is id `dagon`, tier core, display name "Dagon (devnet preview)", `networks: ['solana-devnet']`, one surface `entries.tab`, `permissions: ['address', 'balances']`, icon `Stack`, `freshSigners: true`, `programs` exactly Encrypt, pc-token, pc-swap, SPL Token, Associated Token, System, Compute Budget; and one assertion in `packages/shared/src/powerups/disclosure.test.ts` that `dagon`'s `endpoints` are exactly the Encrypt executor host and `raw.githubusercontent.com`; `registry.test.ts` stays green and lists no `dagon` for `solana-mainnet` (FR-002, FR-004, SC-008)
- [ ] T028 Create `packages/shared/src/powerups/dagon/constants.ts`: pinned program ids, `CONFIG_URL`, executor host, caps 90 s / 180 s, poll 1.5 s, `FRESH_SIGNERS` per action (setup 1, wrap 1, reveal 1, send 0, swap 1, unwrapBurn 1, unwrapDecrypt 1, unwrapComplete 0), `SEND_ENABLED = false`, `WITHDRAW_ENABLED = false`, swap minimum 0.99 (O5), SOL floor 0.01 (O6), 10 items kept (O13) (FR-010, FR-024, FR-027, FR-051)
- [ ] T029 Create `packages/shared/src/powerups/dagon/manifest.ts` until T027 passes (FR-002, FR-004)
- [ ] T030 [P] Create `packages/shared/src/powerups/dagon/locales/en.json` and `packages/shared/src/powerups/dagon/locales/es.json` with the proposed copy under `dagon.*` (usage line, devnet notice, card labels, "not revealed yet", "may be out of date", action and sheet labels, the public-amount and stuck-on-devnet warnings, the reveal cost, the minimum caveat, receipts "submitted, Encrypt is processing", the three item states, every error code of `contracts/dagon-build.md`, "decryption not posted yet, try again"); no "private", "privado", "privada" or "privacidad" (FR-005, FR-023, FR-025, FR-030)
- [ ] T031 Register: `dagonManifest` in `MANIFESTS` (`packages/shared/src/powerups/registry.ts:21`), `export * from './dagon'` in `packages/shared/src/powerups/index.ts`, the `dagon` namespace in `packages/shared/src/powerups/locales.ts`, `packages/shared/src/powerups/dagon/index.ts` (new) (FR-002)
- [ ] T032 [P] Add `dagon` to `POWERUP_LOCALES` in `scripts/check-i18n.mjs` and `'dagon.catalog'` to `MARKERS` in `scripts/check-powerups-bundle.mjs` (FR-005, SC-008)
- [ ] T033 `pnpm turbo run typecheck lint test --filter=@salmon/shared` and `pnpm check:i18n` green

## Phase 7: Powerup logic (FR-010..FR-012, FR-020..FR-032, FR-050..FR-053)

Tests first (T034-T038), then the code (T039-T043).

- [ ] T034 [P] Failing tests in `packages/shared/src/powerups/dagon/config.test.ts` (new): accepts the epoch-2 copy of `devnet.json`; refuses non-object, `cluster !== 'devnet'`, each of the three pinned program ids changed, an `encryptGrpcUrl` on another host, a side missing or with `decimals !== 2`, each `layout` offset changed, a fetch failure; no cached or default config on refusal; `faucetUrl` null vs an https URL drives "Get test tokens" (FR-010, FR-011, FR-012)
- [ ] T035 [P] Failing tests in `packages/shared/src/powerups/dagon/chain.test.ts` (new): pc-account PDA `[b"pc_account", pcMint, owner]` matches a known devnet address; `balanceCt` read from `data[64..96]`; activated only when both sides exist; `isSettled` truth table (digest changed AND `data[99] === 1`, each signal alone is false, `snapshot: null` with a settled account is true); all-zero digest detected; one `getMultipleAccounts` per poll for every watched ciphertext (O1) (FR-027, FR-030, FR-052)
- [ ] T036 [P] Failing tests in `packages/shared/src/powerups/dagon/executor.test.ts` (new): request frame bytes (`0x00` ‖ u32 BE ‖ fields 1-3) for a fixed `readAuthorization`, headers per `contracts/encrypt-executor-and-config.md`; response frame split with a `0x80` trailer; non-zero `grpc-status` in headers or trailer is an error; `value` shorter than 8 bytes is an error, never 0; u64 little-endian decode (FR-031, FR-052)
- [ ] T037 [P] Failing tests in `packages/shared/src/powerups/dagon/operations.test.ts` (new): fresh-signer count per action from `FRESH_SIGNERS`; amounts at 2 decimals; state keyed `${publicKey}:${networkId}`, nothing crosses accounts; processing → done only on `isSettled` for every watched ciphertext; processing → unknown at 90 s, 180 s for `unwrapDecrypt`, measured from `submittedAt` after a restart; newest 10 kept; "may be out of date" when a done operation on a side is newer than its `readAt`; withdraw progress stores only `burnedCt` and `requestAcct` (no field holds key material) and resumes at the stored step, `already_requested` skips to step 3; confirmation rows (amount, minimum + caveat, reveal cost, public-amount warning, fee row `5000 × (1 + N)` + priority fee, omitted without the envelope fields, O9); receipt title is always "submitted, Encrypt is processing" (FR-012, FR-022, FR-025, FR-026, FR-027, FR-029, FR-051)
- [ ] T038 Failing tests in `packages/shared/src/powerups/dagon/useDagonScreenLogic.test.tsx` (new), fake `buildPowerup` and fake `requestFreshSignature`: first visit offers only Activate (US1); every build call is `buildPowerup('dagon', 'solana-devnet', { publicKey, action, …, freshSigners })` with the params of `contracts/dagon-build.md` (swap `sideIn`/`sideOut`/`amountIn`/`minAmountOut`); no proposal carries `pending`; no reveal request on mount, focus or timer, only after the user's tap (SC-003); Reveal disabled while one is in flight; reveal reads the executor with the returned `readAuthorization` and retries with the same one; swap refuses an all-zero input digest with "your earlier hide is still being processed"; SOL below the floor refuses before the build; `409 setup_required` (swap) and `409 recipient_setup_required` (send, `owner = to`) offer the setup as its own request, then rebuild; `422 simulation_failed` on `unwrapComplete` maps to "decryption not posted yet, try again" (O8); `SolanaOutcomeUnknownError` clears the form, marks "outcome unknown", never resubmits; `SignatureRequestCancelledError` changes nothing; every other error goes through `describePowerupBuildError` with Dagon's codes; switches off hide Send and Withdraw but keep an in-progress withdraw listed with Continue; the operation is recorded in `onOutcome(true)`; config refusal yields the unavailable state with retry (FR-011, FR-021, FR-023, FR-024, FR-028, FR-030, FR-032, FR-050, FR-053, SC-003, US1-US7)
- [ ] T039 [P] Implement `packages/shared/src/powerups/dagon/config.ts` until T034 passes (FR-010, FR-011)
- [ ] T040 [P] Implement `packages/shared/src/powerups/dagon/chain.ts` through `solanaRpcFor('solana-devnet')` until T035 passes (FR-027, FR-030, FR-052)
- [ ] T041 [P] Implement `packages/shared/src/powerups/dagon/executor.ts` over plain `fetch` + `arrayBuffer()` until T036 passes (FR-031, FR-052)
- [ ] T042 Implement `packages/shared/src/powerups/dagon/operations.ts` until T037 passes (after T040) (FR-012, FR-022, FR-025..FR-029)
- [ ] T043 Implement `packages/shared/src/powerups/dagon/useDagonScreenLogic.ts` with `useRequestFreshSignature`, `buildPowerup`, `toPowerupProposal` (`expect: { allowedPrograms: dagonManifest.programs }`, no `pending`) and `usePowerupState('dagon', …)`, the 1.5 s poll only while mounted, until T038 passes (FR-020..FR-032, FR-050, FR-053)
- [ ] T044 `pnpm turbo run typecheck lint test --filter=@salmon/shared` green

## Phase 8: Mobile surface (FR-003, FR-020..FR-025, SC-002)

- [ ] T045 Failing test in `apps/mobile/src/components/DagonScreen/DagonScreen.test.tsx` (new): first visit renders the devnet notice and Activate only; the notice renders in every state (loading, unavailable, activated, with items); cards show public balance, "not revealed yet" / value with read time / "may be out of date"; actions in FR-020 order; Send and Withdraw absent with switches off; Reveal disabled while one is in flight; "Get test tokens" only with a non-null `faucetUrl`; no string in `dagon/locales/en.json` or `es.json` matches `/privad|privacidad|private/i` (FR-005, FR-011, FR-020, FR-021, FR-022, FR-024, SC-002, SC-003)
- [ ] T046 Create `apps/mobile/src/components/DagonScreen/types.ts`, `apps/mobile/src/components/DagonScreen/index.ts` and `apps/mobile/src/components/DagonScreen/DagonScreen.tsx` from kit components only (`WarningNotice`, `FactsCard`, `Pill`, `PrimaryButton`, `SecondaryButton`, `SkeletonRow`, `StateBlock`) until T045 passes (FR-020..FR-023)
- [ ] T047 Create `apps/mobile/src/components/DagonScreen/DagonActionSheet.tsx` from the runbook blocks only (`BottomSheetContainer`, `AmountEntryCard` with `useAmountShortcuts` at 2 decimals, `TokenPickerSheet` over the two mock tokens, `TextField` for the recipient, `FactsCard`, `PrimaryButton`); no spinner, confirm button or receipt of its own (FR-012, FR-024)
- [ ] T048 Create `apps/mobile/src/screens/DagonTab.tsx` mirroring `PaymentsTab.tsx`, and return it from `getPowerupTab('dagon')` in `apps/mobile/src/powerups/index.ts:48-54` (FR-002)
- [ ] T049 [P] Add `DagonScreen` to `MOBILE_ONLY` in `scripts/check-dom-parity.mjs` (line 108) with the reason "devnet preview for the Breakpoint demo" (FR-003)
- [ ] T050 `pnpm turbo run typecheck lint test --filter=@salmon/mobile` and `pnpm check:parity` green

## Phase 9: Gates

- [ ] T051 `pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/mobile`: zero errors, zero warnings
- [ ] T052 [P] `pnpm check:parity`, `pnpm check:i18n`, `pnpm check:no-secrets` green (FR-003, FR-005)
- [ ] T053 [P] `pnpm test:coverage`: thresholds unchanged or raised
- [ ] T054 [P] Powerups-off bundle: `EXPO_PUBLIC_POWERUPS=off npx expo export --platform all --output-dir "$TMPDIR/dagon-off"` from `apps/mobile`, then `pnpm check:powerups-bundle "$TMPDIR/dagon-off"`; `dagon.catalog` absent (SC-008)
- [ ] T055 Unchanged-path proof: `git diff --stat $(git merge-base HEAD origin/staging) -- <the 13 files of the unchanged-path rule>` prints nothing, and the T013 snapshot test passes (FR-045, SC-004)
- [ ] T056 Key-leak review: grep the branch diff for `console.`, storage writes and serialisation near `fresh`, `viewer`, `signer`; none touches key material (SC-005)
- [ ] T057 `security-reviewer` agent on the core diff (`packages/shared/src/core/**`, `eslint.config.js`, `apps/mobile/app/(app)/_layout.tsx`) and the Powerup's use of `requestFreshSignature`; every finding fixed or answered in writing (FR-040..FR-046, SC-004, SC-005)
- [ ] T058 `web3-security-review` skill on the same diff (signer set, fee payer, blockhash swap, key lifetime, read-message shape); findings fixed, then T051-T055 re-run green (FR-042, FR-043, FR-044)

## Phase 10: Copy approval (D6, FR-005)

- [ ] T059 **OWNER** Approve the EN and ES strings in `packages/shared/src/powerups/dagon/locales/en.json` and `es.json` (the agent sends them as a table); the agent applies any change and re-runs `pnpm check:i18n` and T045. **GATE** for Phases 11-12 (FR-005, SC-002)

## Phase 11: Manual QA on the Android emulator against the backend in Docker

Needs T001, T002, T004, T059. The agent prepares; the owner taps. No Maestro. Checklist: `specs/043-dagon-powerup/quickstart.md` §3.

- [ ] T060 Start the backend in Docker from `salmon-wallet-backend` (`docker compose up -d`; `curl -s http://localhost:3000/local/health` healthy) and run the Android availability probe of quickstart §1 (FR-050)
- [ ] T061 Start the Android emulator, build the app locally and install it (`EXPO_PUBLIC_SALMON_ENV=local EXPO_PUBLIC_POWERUPS=on npx expo run:android` from `apps/mobile`; the app then calls `http://10.0.2.2:3000/local`); leave it at the first screen and hand the owner the checklist in quickstart §3
- [ ] T062 **OWNER** Run quickstart §3 rows 1-11 on the emulator (a human confirms every transaction) and save the screenshots to `~/Desktop/dagon-qa/`; row 2 also proves non-extractable key generation and signing on Hermes (plan Risks) (SC-001, SC-002, US1-US5)
- [ ] T063 **OWNER** With `SEND_ENABLED` and `WITHDRAW_ENABLED` flipped on locally by the agent in `packages/shared/src/powerups/dagon/constants.ts`, run quickstart §3 rows 12-13; the agent flips both back and `git diff` shows them `false` (SC-007, US6, US7)
- [ ] T064 Read every screenshot and failed row; name the cause before any fix; after fixes re-run Phase 9 and the failed rows

## Phase 12 (optional): iOS EAS `staging` build

Runs only if the owner asks for it; no staging for now. Needs T003, T005, T059 and Phase 11 passed.

- [ ] T065 **OWNER, optional** `eas build --profile staging --platform ios` from `apps/mobile`; internal distribution to the registered iPhones on the `staging` channel; never `production`, never `eas submit`, never TestFlight (FR-001, D2)
- [ ] T066 **OWNER, optional** On a registered iPhone against staging, run quickstart §3 rows 1-8 with the pre-funded team wallet before the event (SC-001)

## Dependencies and gates

- Phases 1 → 5 in order (each core phase builds on the previous one's types); Phase 5 finishes before any file under `powerups/dagon/` exists.
- T013 before T015 (the snapshot records today's bytes). T025 pulls the manifest field forward from Phase 6.
- Phase 6 before Phase 7; within Phase 7, T034-T037 in parallel, T038 after them, T039-T041 in parallel, T042 after T040, T043 last.
- Phase 8 after Phase 7; Phase 9 after Phase 8; T057-T058 after T051-T056.
- Phase 11 needs T001, T002, T004, T059. The optional Phase 12 needs T003, T005, T059 and Phase 11.
- Phase 0 owner tasks run in parallel with Phases 1-10.

## Parallel examples

- Phase 0: T004 and T005 alongside the backend work.
- Phase 7 tests: T034, T035, T036, T037 together; implementations T039, T040, T041 together.
- Phase 9: T052, T053, T054 together after T051.

## Implementation strategy

Core first and proven alone (Phases 1-5, checkpoint after T026), then the Powerup in shared (6-7), then the screen (8), gates and reviews (9), copy (10), owner QA on the Android emulator against the Docker backend (11); the iOS staging build (12) only if the owner asks for it. Nothing is distributed from an intermediate commit; the branch is never merged.

## Traceability (every FR to its tasks)

| FR | Tasks |
| --- | --- |
| FR-001 | T003, T065 (optional phase; the never-merged branch and the local-only build hold FR-001 meanwhile) |
| FR-002 | T027, T029, T031, T048 |
| FR-003 | T049, T052 |
| FR-004 | T027, T029 |
| FR-005 | T030, T032, T045, T052, T059 |
| FR-010 | T028, T034, T039 |
| FR-011 | T034, T038, T039, T045 |
| FR-012 | T034, T037, T042, T047 |
| FR-020 | T043, T045, T046 |
| FR-021 | T038, T045 |
| FR-022 | T037, T042, T045, T046 |
| FR-023 | T030, T038, T045 |
| FR-024 | T028, T038, T045, T047 |
| FR-025 | T030, T037, T042 |
| FR-026 | T037, T042 |
| FR-027 | T028, T035, T037, T040 |
| FR-028 | T038, T043 |
| FR-029 | T037, T042 |
| FR-030 | T030, T035, T038, T040 |
| FR-031 | T036, T041 |
| FR-032 | T038, T043 |
| FR-040 | T021, T022, T023, T025 |
| FR-041 | T017, T018, T021 |
| FR-042 | T010, T011, T021, T058 |
| FR-043 | T014, T015, T019, T021, T058 |
| FR-044 | T017, T018, T021, T023, T058 |
| FR-045 | T012, T013, T016, T019, T020, T026, T055 |
| FR-046 | T006, T007, T008 |
| FR-050 | T001, T038, T043, T060 |
| FR-051 | T001, T028, T037 |
| FR-052 | T035, T036, T040, T041 |
| FR-053 | T001, T038, T043 |

| SC | Tasks |
| --- | --- |
| SC-001 | T062 (Android emulator), T066 (optional iOS) |
| SC-002 | T045, T059, T062 |
| SC-003 | T038, T045 |
| SC-004 | T010, T013, T021, T055 |
| SC-005 | T021, T056, T057 |
| SC-006 | T006 |
| SC-007 | T063 |
| SC-008 | T027, T032, T054 |

Every FR and SC maps to at least one task.
