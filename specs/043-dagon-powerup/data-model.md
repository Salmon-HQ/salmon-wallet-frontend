# Data Model: Dagon Powerup (devnet preview)

What the feature holds, where it lives, and how it changes. Two homes only: core memory (keys, never persisted) and the Powerup's `usePowerupState('dagon', …)` slice (public data, persisted).

## Core memory (never persisted, never returned to the Powerup)

### FreshSignerSet

Lives on the parked request inside `SignatureRequestProvider` (`ParkedRequest.fresh`), from key generation to one of: build throws, pre-park check refuses, cancel, unknown outcome, success.

| Field | Type | Rule |
| --- | --- | --- |
| `signers` | `KeyPairSigner[]` | `0..MAX_FRESH_SIGNERS` (1); generated with `generateKeyPairSigner()`, non-extractable |
| `viewer` | `KeyPairSigner \| undefined` | only when the request asked for one; requires `signers.length === 1` |

Only `signers[i].address` and `viewer.address` cross to the Powerup (as `FreshSignerKeys`). Dropping the reference is the discard: the private halves are non-extractable `CryptoKey`s that nothing else references.

### ReadAuthorization (returned)

| Field | Type | Rule |
| --- | --- | --- |
| `message` | `Uint8Array` (43 bytes) | `[0, 32, …signers[0] address bytes, 0, 0×8]` (research R6) |
| `signature` | `Uint8Array` (64 bytes) | ed25519 by `viewer` over `message` |
| `signer` | `Uint8Array` (32 bytes) | `viewer`'s public key |

## Powerup state (persisted through `usePowerupState`)

```ts
type DagonState = Record<AccountKey, DagonAccountState>; // AccountKey = `${publicKey}:${networkId}`

interface DagonAccountState {
  revealed: Partial<Record<Side, { amount: string; readAt: number }>>; // base units, 2 decimals
  operations: Operation[];                                              // newest first, max 10 (O13)
  withdraw?: WithdrawProgress;
}

type Side = 'USDC' | 'DOGE';
```

Per account and network, so nothing from one account shows on another, and mainnet items (none exist) would never mix with devnet ones (spec edge cases).

### Operation

| Field | Type | Rule |
| --- | --- | --- |
| `id` | `string` | random per submission (`crypto.randomUUID()` or the time + action) |
| `action` | `'setup' \| 'wrap' \| 'reveal' \| 'send' \| 'swap' \| 'unwrapBurn' \| 'unwrapDecrypt' \| 'unwrapComplete'` | |
| `sides` | `Side[]` | one, or two for swap |
| `amount` | `string?` | base units as requested; never an outcome |
| `submittedAt` | `number` | ms; the cap counts from here |
| `watch` | `{ address: string; snapshot: string \| null }[]` | ciphertexts whose settlement means "done"; `snapshot` = hex of `data[2..34]` read before sending, `null` when the account did not exist |
| `state` | `'processing' \| 'done' \| 'unknown'` | see transitions |
| `readAuthorization` | `{ message, signature, signer }` as base64 strings, reveal only | public data; reused for read retries (R5) |

What each action watches:

| Action | Watched ciphertext(s) | Cap |
| --- | --- | --- |
| setup | the new `balanceCt` (= `freshSigners[0]`), snapshot `null` | 90 s |
| wrap | the user's `balanceCt` for the side | 90 s |
| reveal | `viewCt` (= `freshSigners[0]`), snapshot `null`; then the executor read | 90 s |
| send | the sender's `balanceCt` | 90 s |
| swap | both user `balanceCt`s | 90 s |
| unwrapBurn | the user's `balanceCt` | 90 s |
| unwrapDecrypt | none on chain (O8); "processing" until step 3 is built or the cap | 180 s |
| unwrapComplete | none; public balance re-read | 90 s |

### Operation state transitions

```text
(confirmed, onOutcome(true)) ──► processing
processing ──(every watched CT: digest ≠ snapshot AND data[99] = 1)──► done
processing ──(cap passed since submittedAt)──► unknown
(SolanaOutcomeUnknownError from core) ──► unknown            // form cleared, never resubmitted
reveal: done ──► executor read ──► revealed[side] = { amount, readAt }   // read error: retry, value untouched
```

"done" means Encrypt finished, never that funds moved (FR-027). Any "done" operation on a side newer than `revealed[side].readAt` marks that card "may be out of date" (FR-022).

### WithdrawProgress

| Field | Type | Rule |
| --- | --- | --- |
| `side` | `Side` | |
| `amount` | `string` | base units requested |
| `step` | `1 \| 2 \| 3` | the next step to run |
| `burnedCt` | `string?` | public address, stored after step 1 confirms (Q3); receipt PDA `[b"pc_receipt", burnedCt]` derives from it |
| `requestAcct` | `string?` | public address, stored after step 2 confirms |
| `decryptRequestedAt` | `number?` | starts the 180 s window |

Transitions: `step 1` confirmed → store `burnedCt`, `step = 2`; `step 2` confirmed → store `requestAcct`, `step = 3` (never requested twice: the backend answers `already_requested`, and the stored `requestAcct` skips step 2); `step 3` confirmed → cleared. Withdraw switch off: the progress stays listed with "Continue" (US7 scenario 1). No private key is ever a field here (FR-029).

## Read-only data (not persisted)

### DagonConfig (from `devnet.json`, fetched on mount)

`epoch`, `cluster`, `encryptGrpcUrl`, `faucetUrl`, `programs { encrypt, pcToken, pcSwap }`, `sides.{USDC,DOGE} { decimals, splMint, pcMint, vault, vaultAta }`, `pool { address, … }`, `layout`. Accepted only under research R8; otherwise the tab shows the unavailable state.

### TokenPosition (per side, read from chain)

| Field | Source |
| --- | --- |
| `activated` | pc-account PDA `[b"pc_account", pcMint, owner]` exists |
| `balanceCt` | pc-account `data[64..96]` |
| `balanceDigest`, `balanceVerified` | `balanceCt` `data[2..34]`, `data[99] === 1` |
| `publicBalance` | the owner's token account for `splMint` |

The wallet is "activated" when both sides are. Swap refuses when the input side's `balanceDigest` is all zeros (FR-030).
