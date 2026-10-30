# Research: Dagon Powerup (devnet preview)

**Spec**: [spec.md](./spec.md) · **Gathered**: 2026-10-27 (spike), signing design adopted 2026-10-30

The facts behind the spec: what Dagon's programs need, what the spike proved on devnet, how other wallets present hidden balances, and why the signing design has the shape it has. The spec states the requirements; this file is the evidence for them. Where the two differ (the build contract, the persisted unwrap state), the spec wins: it records the owner's decisions of 2026-10-30.

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

- **Nothing is encrypted today.** Encrypt is pre-alpha: values are plaintext on chain and the executor returns plaintext. The network key is a constant (32 × `0x55`). Every surface must say so. The owner's rule (2026-10-30): the word "private" never appears; "Hide" and "hidden balance" appear only on a surface that also shows the always-visible devnet notice that amounts are not actually encrypted yet.
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

### Adopted design: core-generated fresh signers (owner, 2026-10-30)

**Core-generated fresh signers.** Core gains one narrow capability: a proposal may declare that it needs N fresh accounts.

1. Core generates N keypairs on the device and passes only their public keys to the backend build request.
2. The backend adapter builds the instructions naming those public keys; the build service accepts exactly `1 + N` signatures for a registry entry that declares `freshSigners`, and checks that the extra signer slots are the public keys it was given.
3. Core verifies the returned message: the extra signers are exactly the keys it generated, every program is in the manifest, the fee payer is the user. The user confirms on the core screen; core then puts the fresh blockhash on the message and signs with the fresh keys and the user key in one step, broadcasts, and discards the fresh keys. Signing the fresh keys earlier would not work: `core/broadcast/solana.ts` replaces the blockhash right before signing, which invalidates any signature made over the old message. An unwrap keeps only `requestAcct`'s public address between steps; UnwrapComplete needs it read-only.
4. The `viewer` key for a reveal is generated and kept in memory on the device; core signs the read message with it and returns only the signature and the public key, so neither the backend nor a Powerup ever holds it, and the user's key never signs a message.

Why this shape: no private key leaves the device and the backend still signs nothing; the Powerup still never touches a signer; the extra signatures are bounded to keys core created a moment earlier, so a malicious build cannot smuggle in a signer it controls.

Rejected alternatives: building transactions in the client (contradicts "a Powerup consumes the backend's build endpoint, it is never designed in the client"); the backend generating and partially signing the fresh keys (the backend would sign, and for a reveal it would hold the key that reads the user's balance); asking Dagon to use PDAs instead of fresh keypairs (the ciphertext accounts are created by Encrypt, outside Dagon's control, and nothing could ship before Breakpoint).

`CreateInput` sends the plaintext amount to the executor whoever calls it. The backend adapter calls it during the build (it already holds every other build input), which keeps the executor out of the device's endpoints except for `ReadCiphertext`.

## Details the spec relies on

- **Send and a first-time recipient.** Transfer itself needs no fresh signer, but a recipient without a pc-account must first be set up with InitializeAccount, whose `balanceCt` is a fresh signer the sender's wallet generates and discards (`GUIDE.md` §6). As in Dagon's reference, this is a separate transaction: the backend answers `409 recipient_setup_required`, and the wallet builds a setup with owner = recipient (one fresh signer) before building the send (owner's contract, 2026-10-30).
- **Reveal needs the viewer key twice.** `viewer`'s public key goes into the ViewBalance build as the authorized reader (read-only, not a transaction signer); after the transaction confirms, the read message (BCS: `chain u8 = 0` ‖ `ciphertext_id` 32 bytes, ULEB128-prefixed ‖ empty `reencryption_key`, length-prefixed ‖ `epoch u64 LE = 0`) is signed with `viewer`'s ed25519 key and sent to `ReadCiphertext` (`GUIDE.md` §5). Core must therefore hold `viewer` in memory from the build to the read, and nowhere else.
- **Unwrap state between steps.** UnwrapBurn creates `burnedCt` (fresh signer) and a receipt PDA `[b"pc_receipt", burnedCt]`; UnwrapDecrypt needs that receipt and a fresh `requestAcct` signer, and can be requested only once per receipt; UnwrapComplete needs `requestAcct` read-only (`GUIDE.md` §9). So step 2 needs the receipt (or `burnedCt`) address from step 1, and step 3 needs `requestAcct`'s address from step 2. Only public addresses are needed between steps; no key outlives its own transaction.
- **Transaction format.** Dagon's guide builds legacy transactions; the Salmon contract returns a v0 transaction with no lookup tables, which the programs accept the same way.
- **Funding.** `devnet.json` has `faucetUrl: null`. Dagon's faucet mints 1 000 mock-USDC and 1 000 mock-DOGE per wallet with a 4-hour cooldown, run by Dagon on request; a public `POST /faucet/{wallet}` will appear as `faucetUrl` (`GUIDE.md` §10).
- **Executor host.** `encryptGrpcUrl` is `https://pre-alpha-dev-1.encrypt.ika-network.net:443` in epoch 2.
