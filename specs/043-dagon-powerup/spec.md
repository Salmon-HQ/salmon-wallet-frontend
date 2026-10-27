# Feature Specification: Dagon Powerup (devnet preview)

**Feature Branch**: `feat/dev-93-dagon-powerup` (spec dir `043-dagon-powerup`; backend branch of the same name)

**Created**: 2026-10-27

**Status**: Draft. Research done; blocked on the owner decisions listed under "Decisions the owner owes" (AGENTS.md, "Starting a new Powerup", step 2). No code is written until they are answered.

**Input**: Owner (Linear DEV-93, 2026-10-21 and 2026-10-27): "Breakpoint demo only, iOS via TestFlight, every flow Dagon has (wrap, reveal, unwrap, send, swap), devnet.json read from Dagon's GitHub at runtime with the program ids pinned, no TestFlight until the iOS 1.4.0 review (OPS-42) closes. Test everything; see it working locally first."

## What the capability is

Dagon (Inkwell Finance) publishes `pc-token` and `pc-swap`, two Solana programs built on Encrypt (dWallet Labs), a network that does arithmetic on encrypted numbers (FHE). A pc-token is a copy of an ordinary SPL token whose balance is stored as a ciphertext account instead of a number. The flows:

| Flow                  | What the user does                                                                                                   | Transactions                                                                                  | Extra signers (fresh keypairs)                                      | Encrypt executor calls                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------- |
| Setup (once per mint) | nothing visible                                                                                                      | `create_deposit` + `InitializeAccount`                                                        | `balanceCt`                                                         | none                                  |
| Wrap                  | moves SPL into the vault, gets the same amount as pc-token; the amount is public                                     | `Wrap` (30)                                                                                   | `amountCt` (epoch 2: the program creates it from the SPL amount)    | none                                  |
| Reveal                | sees their own balance                                                                                               | `ViewBalance` (40)                                                                            | `viewCt`; plus a `viewer` key that signs the read message off chain | `ReadCiphertext` (signed by `viewer`) |
| Send                  | moves pc-token to another wallet; recipient, sender and time are public, the amount is not (once encryption is real) | `Transfer` (3), plus `InitializeAccount` for a first-time recipient                           | recipient `balanceCt` when new                                      | `CreateInput(amount)`                 |
| Swap                  | pc-token for pc-token against an encrypted pool, with a minimum output                                               | `Swap` (pc-swap 1)                                                                            | `receiptCt`, plus `outBalanceCt` when new                           | 3× `CreateInput` (in, min out, 0)     |
| Unwrap                | burns pc-token, gets the SPL back                                                                                    | `UnwrapBurn` (31), `UnwrapDecrypt` (32), `UnwrapComplete` (33), with a wait between 32 and 33 | `burnedCt`, then `requestAcct` (persisted until step 33)            | `CreateInput(amount)`                 |

Sources: Dagon's integration guide (`GUIDE.md` §1–§9 and "What changed in epoch 2") and `devnet.json` at https://github.com/inkwell-finance/pc-wallet-kit (main `941a65a`, epoch 2); the vendored program sources there (`vendor/encrypt/examples/pc-token/lib.rs`, `pc-swap/lib.rs`), built from `inkwell-finance/encrypt-pre-alpha` branch `inkwell/epoch-2-hardening` commit `0055f80`.

### Facts that shape the design

- **Nothing is encrypted today.** Encrypt is pre-alpha: values are plaintext on chain and the executor returns plaintext. The network key is a constant (32 × `0x55`). Every surface must say so; no copy may say "private" or "hidden" while this holds.
- **Every flow except send needs fresh co-signers.** pc-token and pc-swap refuse a ciphertext account that is not a fresh, empty, system-owned signer (`require_fresh`). This is a property of the programs, not of Dagon's client.
- **Failures are silent by design.** An insufficient balance, a swap below its floor or an unwrap larger than the balance succeeds on chain and moves nothing. The outcome is known only after a reveal.
- **Settled is two signals.** A ciphertext has settled when its digest (`data[2..34]`) changed against a snapshot taken before sending AND its status byte (`data[99]`) is 1. The digest alone fires before the executor commits.
- **The executor drops some transactions** (Dagon measured 5 of 50 in one run). A dropped write leaves its ciphertexts pending forever; on a pool it stalls the pool for everyone, and Dagon publishes a replacement pool under a new `devnet.json` epoch.
- **Known issues on devnet today** (from `devnet.json`): the swap floor is not enforced by the executor, so a swap can fill below its minimum; `transfer()` is not verified end to end.
- **Unwrap has no refund path.** If the executor never answers the decryption request, the burned amount stays stuck. Dagon advises keeping unwrap out of a live demo.
- **A reveal costs a transaction** and about 0.002 SOL of rent for the copy, which is not reclaimed.
- **Mock tokens use 2 decimals**; their mint authority is Dagon's faucet. Test tokens are funded by Dagon on request (QA wallet addresses).
- **Anyone can overwrite any ciphertext on devnet** by calling the Encrypt program directly (reported by Dagon 2026-10-03, no fix date). Balances on devnet are therefore not trustworthy, which is acceptable for a preview with worthless tokens.

### Spike (2026-10-27, read-only, scratch code)

- `devnet.json` fetched from `raw.githubusercontent.com`: epoch 2, status `deployed`. Every program, mint, vault, vault ATA, pool and reserve ciphertext exists on devnet with the expected owner; the USDC mint reports 2 decimals; a reserve ciphertext has a non-zero digest and status byte 1.
- One unary gRPC-web call to the executor (`ReadCiphertext`) written by hand: protobuf fields encoded inline, the response read with `fetch` + `arrayBuffer()` (no streaming body). The executor answered in ~1.4 s with grpc-status 7, "signer is not authorized to read this ciphertext": the transport works and the executor enforces read authorization.
- `@protobuf-ts/grpcweb-transport`, which Dagon's client uses, requires `response.body` as a stream and fails on React Native's default `fetch`. The hand-written unary call needs neither that package nor streaming, so it runs on Hermes and in the extension alike. Both executor calls are unary.

### How other wallets present hidden balances

No shipped Solana wallet (Phantom, Solflare, Backpack) shows Token-2022 confidential balances yet, so the references are the protocol's own model and two analogues from other chains:

- **Solana Token-2022 confidential transfer** ([docs](https://solana.com/docs/tokens/extensions/confidential-transfer)): incoming amounts land in a "pending" balance that is not spendable until the owner applies it; withdrawing back to a public balance takes several transactions; "only transfer amounts and token balances are private", addresses stay public.
- **Zcash wallet UX checklist** ([Zcash docs](https://zcash.readthedocs.io/en/master/rtd_pages/ux_wallet_checklist.html)): warn only when moving funds from shielded to public, and say it reveals the amount; show the total next to what is spendable; list pending sends in their own section with the time left.
- **Keplr viewing keys on Secret Network** ([Keplr guide](https://blog.keplr.app/enable-mint-secret-scrt-with-keplr/)): reading a hidden balance needs an on-chain step that costs gas, and the surprise fee and failed retries are the reported pain points.

Questions borrowed (behaviour, not look): say what a reveal costs before it happens; show the last revealed value with its time and a "may be out of date" label; treat a multi-transaction flow (unwrap) as one flow with visible, resumable steps; put the privacy limits in plain words at wrap time ("amounts hidden once encryption is live; your address, the recipient and the token are public"); warn at unwrap that the amount becomes public; mark the whole surface as a devnet preview.

## The conflict with the Powerup architecture

Salmon's Powerup contract assumes the user is the only signer:

- Backend: `/powerups/:id/build` refuses a compiled message that needs more than the payer's signature (`assertSingleSigner`, `src/services/solana/powerups/powerup-build-service.js`).
- Frontend: a Powerup cannot import `core/signing`; it asks core for one signature through `core/confirmation`, and `signProposal` signs with the user's key only.

Dagon's programs need fresh co-signers on five of the six transaction kinds. Integrating them changes the signing path, which `AGENTS.md` marks security-sensitive and which needs the owner's explicit sign-off.

### Proposed design (for the owner's decision)

**Core-generated fresh signers.** Core gains one narrow capability: a proposal may declare that it needs N fresh accounts.

1. Core generates N keypairs on the device and passes only their public keys to the backend build request.
2. The backend adapter builds the instructions naming those public keys; the build service accepts exactly `1 + N` signatures for a registry entry that declares `freshSigners`, and checks that the extra signer slots are the public keys it was given.
3. Core verifies the returned message: the extra signers are exactly the keys it generated, every program is in the manifest, the fee payer is the user. It partially signs with the fresh keys, the user confirms on the core screen, and core signs and broadcasts. The fresh keys are discarded after sending, except `requestAcct` during an unwrap, which core keeps until step 33.
4. The `viewer` key for a reveal is generated and kept on the device; the read request to the executor is signed there, so neither the backend nor a Powerup ever holds it.

Why this shape: no private key leaves the device and the backend still signs nothing; the Powerup still never touches a signer; the extra signatures are bounded to keys core created a moment earlier, so a malicious build cannot smuggle in a signer it controls.

Rejected alternatives: building transactions in the client (contradicts "a Powerup consumes the backend's build endpoint, it is never designed in the client"); the backend generating and partially signing the fresh keys (the backend would sign, and for a reveal it would hold the key that reads the user's balance); asking Dagon to use PDAs instead of fresh keypairs (the ciphertext accounts are created by Encrypt, outside Dagon's control, and nothing could ship before Breakpoint).

`CreateInput` sends the plaintext amount to the executor whoever calls it. The proposal is that the backend adapter calls it during the build (it already holds every other build input), which keeps the executor out of the device's endpoints except for `ReadCiphertext`.

## Decisions the owner owes

Each has a recommendation; none is taken until the owner answers.

1. **Signing design.** Approve "core-generated fresh signers" above, or choose another. _Recommended: approve._
2. **What core owes.** pc-token balances and vault deposits exist on chain whether or not the Powerup is installed. AGENTS.md step 3 says core must show such a position either way. _Recommended: waive it for this devnet-only preview, record the waiver in this spec, and revisit before any mainnet discussion._
3. **Surface.** A Home sub-tab (it holds a balance the user returns to) or an action inside an existing screen. _Recommended: a sub-tab, like SKR and Payments._
4. **Platforms and twins.** DOM parity requires a DOM twin or a `MOBILE_ONLY` entry with a reason. _Recommended: mobile only for the demo, listed in `MOBILE_ONLY` with the reason "devnet preview for the Breakpoint demo"; the availability table offers it on iOS only._
5. **Flows in the demo build.** The owner asked for all of them. _Recommended: wrap, reveal and swap on; send behind a switch until Dagon verifies `transfer()`; unwrap built and tested but off in the demo, because an executor drop strands the burned amount with no refund._
6. **Swap floor.** The executor does not enforce it today. _Recommended: keep the floor input and say under it that devnet does not enforce it yet._
7. **Disclosure.** `permissions` is `balances` (the executor receives every amount in plaintext and the caller's IP); `endpoints` are the executor and `raw.githubusercontent.com`. _Recommended: approve as written._
8. **Copy.** English is drafted from Dagon's own wording and the runbook; the Spanish must come from the owner (`i18n-authoring`).
9. **Fee.** None. _Recommended: no Salmon fee on a devnet preview._
10. **Name.** User-facing name and id. _Recommended: id `dagon`, name "Dagon (devnet preview)", which names the counterparty and avoids the word "private"._

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Wrap and reveal (Priority: P1)

On devnet, the user turns on the Dagon Powerup, wraps mock USDC into pc-USDC and reveals their pc-USDC balance. The tab shows the last revealed amount with the time it was read; revealing again is an explicit action that says it costs a transaction.

**Independent Test**: a QA wallet funded by Dagon wraps 10.00 mock USDC; after settlement a reveal shows 10.00 pc-USDC; the SPL balance dropped by 10.00.

### User Story 2 - Swap (Priority: P1)

The user swaps pc-USDC for pc-DOGE with a minimum output. The result is "submitted", then "settled", then "filled" or "nothing moved" after a reveal; it is never shown as a plain success from the signature alone.

**Independent Test**: a 1.00 pc-USDC swap on the epoch 2 pool settles and a reveal of pc-DOGE shows the increase.

### User Story 3 - Send (Priority: P2, behind a switch)

The user sends pc-USDC to another devnet address; a first-time recipient is onboarded in the same transaction.

**Independent Test**: once Dagon verifies `transfer()`, a 1.00 send between two QA wallets is revealed on both sides.

### User Story 4 - Unwrap (Priority: P2, off in the demo build)

The user burns pc-USDC and gets mock USDC back after three transactions and a wait. The screen says the wait can take minutes and that an executor failure can leave the amount stuck on devnet.

### Edge Cases

- `devnet.json` unreachable, malformed, or its epoch or program ids differ from the ones pinned in the manifest: the Powerup shows a "not available" state and builds nothing.
- The executor is unreachable or times out after a transaction confirmed: "settling" with a later re-check; never an error that hides a real transaction, never a zero.
- A reveal read returns fewer than 8 bytes: an error, never zero.
- A pool stalled by a dropped executor write: swap shows "temporarily unavailable" until `devnet.json` names a new pool.
- The user's input ciphertext has an all-zero digest (never committed): swap refuses and says the deposit is still settling.
- The wallet is on mainnet: the Powerup does not appear.

## Requirements _(mandatory)_

Written for the recommended answers above; they change if the owner answers differently.

- **FR-001**: Backend registry entry `dagon` (core, `solana-devnet`, `freshSigners`, `programIds` = Encrypt, pc-token, pc-swap, SPL Token, Associated Token, System, Compute Budget), stage config on devnet only, analytics enum, and an availability row offering it on iOS only. The backend reads `devnet.json` with the same pinning rule as the client.
- **FR-002**: Backend adapter building each transaction kind from the caller's address, amounts and the fresh public keys; it calls `CreateInput` where the flow needs it. Build service accepts `1 + N` signatures only for entries that declare `freshSigners`, and only for the keys passed in.
- **FR-003**: Core "fresh signers" capability as described above, with unit tests for: wrong extra signer refused, extra signer count different from requested refused, undeclared program refused, fresh keys never persisted except `requestAcct`.
- **FR-004**: Powerup folder `packages/shared/src/powerups/dagon` (manifest: id `dagon`, core, `solana-devnet`, permissions `balances`, endpoints executor + `raw.githubusercontent.com`, programs pinned, tab `dagon`), its locales (EN/ES), the config loader, the executor read client (unary gRPC-web over `fetch` + `arrayBuffer`), the settlement watcher (digest change AND status byte), and `useDagonScreenLogic`.
- **FR-005**: Mobile screen composed only of runbook blocks (`docs/POWERUPS-UI.md`); registered in the entries, `check-i18n`, `check-powerups-bundle`, `check-dom-parity` (`MOBILE_ONLY`).
- **FR-006**: Every result is modelled as `submitted | settled` × `filled | no_op | unknown`, never a boolean.

## Success Criteria _(mandatory)_

- **SC-001**: Unit tests cover the config loader (epoch, pinned programs, malformed file), the settlement predicate, the read-message encoding and the strict u64 decode, and the fresh-signer checks on both sides.
- **SC-002**: On the iPhone simulator against devnet, a QA wallet completes wrap → reveal → swap → reveal (recorded with Maestro).
- **SC-003**: The Powerup is absent on mainnet and in a Powerups-off build (bundle check).
- **SC-004**: No screen says "private", "hidden" or "encrypted" without the pre-alpha qualifier.

## Out of scope

Mainnet (needs an external audit of the programs and an Encrypt mainnet), the extension and Android, TestFlight or store builds (after OPS-42 closes), and a Salmon fee.
