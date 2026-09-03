# Migration from `@solana/web3.js` v1 to `@solana/kit`

apps/web was retired on 2026-09-02; its rows below are history.

Salmon Wallet's Solana stack runs on [`@solana/kit`](https://github.com/anza-xyz/kit) v7 and the generated
program clients under `@solana-program/*`. `@solana/web3.js` v1 is not a production dependency of any
package in this monorepo. It survives only as a devDependency, used as an independent oracle in tests.

This document is written for people who need to trust that claim without taking our word for it:
contributors, forkers, and reviewers. It describes what moved, what did not, and how to verify the
result yourself.

## Status

| Surface           | Solana stack                           | `@solana/web3.js` in production  |
| ----------------- | -------------------------------------- | -------------------------------- |
| `packages/shared` | `@solana/kit` v7 + `@solana-program/*` | No — devDependency, tests only   |
| `packages/ui`     | none (presentation only)               | No — not a dependency            |
| `apps/web`        | via `@salmon/shared`                   | No — dependency removed entirely |
| `apps/extension`  | via `@salmon/shared`                   | No — devDependency, tests only   |
| `apps/mobile`     | via `@salmon/shared`                   | No — not a dependency            |

Completed on the `feat/solana-kit-migration` branch, 2026-07-29 to 2026-08-01, 79 commits. The
migration itself is the first 60; the rest is on-device validation, the app fixes it surfaced, and
the test-harness work that made those runs reproducible.

The measurable effect on shipped code, from clean production builds before and after the final commit:

| Bundle                                                            | Before                             | After                              |
| ----------------------------------------------------------------- | ---------------------------------- | ---------------------------------- |
| `apps/web` `dist/assets/index-*.js`                               | 4,867,073 B raw / 1,763,965 B gzip | 4,638,283 B raw / 1,694,579 B gzip |
| `apps/extension` vendor chunk `dist/chrome-mv3/chunks/fonts-*.js` | 2,028,998 B                        | 1,799,113 B                        |
| `apps/extension` `dist/` total (chrome-mv3 and firefox-mv2 alike) | 5,928 KB                           | 5,708 KB                           |

The extension had already moved `@solana/web3.js` to `devDependencies` earlier in the branch
(`87a3f23`), but kept bundling it transitively through `@salmon/shared`. Removing the last shared
import is what actually took it out of the shipped artifact.

## What moved to kit

Organized by responsibility rather than by file, since the file layout is an implementation detail.

- **Key derivation and signing.** Accounts derive a kit `KeyPairSigner` whose private key is a
  non-extractable WebCrypto `CryptoKey`. The 32-byte ed25519 seed is carried alongside it, because it
  is the only recoverable form of the private key and is what keeps `retrieveSecurePrivateKey()`
  synchronous.
- **Addresses.** A Solana account's public key is a kit `Address` — the branded base58 string — not a
  `PublicKey` object. Address validation is `isAddress()`. Verified to accept and reject identically
  to `new PublicKey()` across the vectors the test suite asserts, and
  `getAddressEncoder().encode(addr)` returns the same 32 bytes as `PublicKey.toBytes()`.
- **Transfers.** Built and signed with `@solana-program/system`, `@solana-program/token-2022` and
  `@solana-program/memo`. Instructions for both token programs are emitted through the Token-2022
  client: its instruction set is a superset of the classic one, and passing the classic program
  address through `programAddress` produces byte-identical instructions.
- **Swaps.** Quote, sign and submit through the kit RPC and the account's kit signer.
- **Prepared NFT transactions and address lookup tables.** Blockhash swapping operates on the
  compiled message and re-encodes it, rather than decompiling and rebuilding, because only that
  round-trips the input bytes exactly. Lookup-table readiness is read with
  `@solana-program/address-lookup-table`.
- **dApp approvals.** Transaction decoding, message compilation and the transaction-lookalike guard
  all use kit codecs.
- **Off-chain message signing (OCMS v1).** Encoding from Anza's `@solana/offchain-messages`, signing
  and verification through kit's `signBytes` / `verifySignature`. See
  [`OFF_CHAIN_MESSAGE_SIGNING.md`](OFF_CHAIN_MESSAGE_SIGNING.md).
- **Sign-In With Solana (SIWS).** Native `solana:signIn`, replacing a heuristic parser that used to
  recognize sign-in text inside raw `signMessage` bytes.
- **Domain resolution.** `@solana-name-service/sns-sdk-kit` for `.sol` and `@onsol/tldparser-kit` for
  AllDomains TLDs.
- **Signature confirmation.** `@solana/transaction-confirmation`.

Packages removed along the way: `@solana/spl-token` and `@solana/spl-memo` (`06497d5`).

## What remains on v1, and why

Nothing in production. `@solana/web3.js` is a devDependency of `packages/shared` and
`apps/extension`, and it is used for exactly one purpose: as a **cross-library test oracle**.

The migration was done by pinning golden vectors. The bytes the old implementation produced are
frozen as constants in the test suite; the implementation is then migrated and required to reproduce
them exactly. Several of those tests additionally construct their fixtures with web3.js at runtime,
so web3.js and kit are compared against each other on every run rather than against a snapshot only
we can regenerate.

A cross-library oracle is stronger evidence than a self-consistent one: if kit and web3.js agree on
the bytes, an error in our understanding of either library shows up as a test failure instead of as a
silently wrong signature. That is worth one devDependency.

`tweetnacl` plays the same role for raw ed25519 signatures in tests. It is also still a production
dependency, but for an unrelated reason: `crypto/encryption.ts` uses it, and that code has nothing to
do with Solana.

## Golden-vector methodology

The pattern, applied to every byte-producing path:

1. Pin the exact bytes the current (web3.js) implementation produces as constants in a test.
2. Migrate the implementation to kit.
3. Require byte-identical output.

The operating rule is the important part: **a golden vector that changes is a bug, not a test to
update.** On-chain bytes changing means signatures change meaning. Any diff in these values stops the
work rather than getting absorbed into it.

Reference commits:

| Commit    | What it pinned                                                   |
| --------- | ---------------------------------------------------------------- |
| `0df0254` | OCMS envelope bytes                                              |
| `ac8385b` | SIWS message text bytes                                          |
| `127ec19` | SIWS byte parity against `@solana/wallet-standard-util`          |
| `551739f` | Signed-transaction serialization bytes                           |
| `4c1f56d` | Blockhash-swap bytes for a v0 transaction carrying lookup tables |
| `33541e5` | `isTransactionLookalike` classification corpus                   |

## The ratchet

`eslint.config.js` warns on any `@solana/web3.js` import outside a test file. It exists so this
migration cannot quietly regress.

It warns rather than fails on purpose. Kit is younger than web3.js and does not cover everything it
does; reaching back for a v1 API is a legitimate answer to a gap, and whoever hits that gap knows
more about their case than a lint rule does. What the warning buys is that the decision happens on
purpose and is visible in review, instead of the dependency drifting back one import at a time.

Test files are exempt by design — that is where the oracle lives, as described above.

It is **two rules, not one**, and the reason is worth recording:
`@typescript-eslint/no-restricted-imports` never visits `TSImportType` nodes, so it silently allows

```ts
type C = import('@solana/web3.js').Commitment;
```

which is a real form that was in use in this repo. A `no-restricted-syntax` selector on
`TSImportType[source.value="@solana/web3.js"]` closes that gap. Both were verified to fire, and the
equivalent `import('@solana/kit').Commitment` was verified not to.

## dApp compatibility

Removing web3.js from the wallet does not remove it from the dApps that talk to the wallet. Plenty of
them still do:

```js
new PublicKey(wallet.publicKey);
wallet.publicKey.toBytes();
```

`apps/extension/src/lib/SalmonAddress.ts` keeps those patterns working. The object injected at
`window.salmon.publicKey` is a `Uint8Array` carrying the `PublicKey` members dApps actually read, so
legacy call sites keep working without every page having to ship web3.js.

It is a compatibility shim, not a `PublicKey`, and the patterns it cannot support are pinned as
deliberately-failing assertions in `SalmonAddress.test.ts`:

- `realPublicKey.equals(salmonAddress)` — the real key reads the other operand's internal `_bn`.
  The reverse direction, `salmonAddress.equals(realPublicKey)`, works.
- Compiling a **legacy** (non-versioned) `Transaction` where the shim is only the fee payer. The
  compiler calls `.equals()` on account metas it built itself, hitting the case above. The same test
  file also pins the case that happens to survive — where the shim sorts first — so the boundary is
  recorded rather than approximated.

Those assertions are the compatibility matrix. If any of them ever starts passing, the shim got
better and the test should say so.

Note that this shim lives in `apps/extension` and is deliberately not shared. Inside
`packages/shared` there is no consumer with that shape, so a local equivalent there would be an
abstraction with no second implementation — and shared may not import from an app.

## Mobile polyfills

Hermes is not a browser, and kit assumes browser cryptography. Four polyfills bridge the gap, all
installed in `apps/mobile/index.js` before anything else loads:

| Polyfill                                                                    | Why                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ed25519 WebCrypto (`@solana/webcrypto-ed25519-polyfill`)                    | Hermes has no `crypto.subtle`. Kit derives and signs through WebCrypto Ed25519.                                                                                                                                                                              |
| SHA-512 digest (pure JS, `@noble/hashes`)                                   | The Ed25519 polyfill signs via `@noble/ed25519`, whose `sha512Async` calls `crypto.subtle.digest`. Native (expo-crypto) digest fails crossing the JSI bridge on Hermes/Android, so this runs in pure JS instead.                                             |
| `AbortSignal` gap-fill (`apps/mobile/src/polyfills/abort-signal.js`)        | Kit's RPC subscription machinery uses `AbortSignal.timeout` / `any` / `throwIfAborted`, which React Native does not implement completely (`257b863`).                                                                                                        |
| `EventTarget` / `CustomEvent` (`apps/mobile/src/polyfills/event-target.js`) | React Native defines neither global. Kit's subscription packages capture `globalThis.EventTarget` at module scope and construct it when a subscription opens, so signature confirmation threw after the transaction had already landed on chain (`5dc27c7`). |

These are only genuinely exercised on Hermes, so a real device or simulator run remains part of the
release check for mobile.

## Verifying a fork

Every claim above is reproducible. From the repo root:

```bash
# 1. No production imports. Expect three lines, all of them comments.
grep -rn "@solana/web3.js" --include='*.ts' --include='*.tsx' packages/ apps/ \
  | grep -v node_modules | grep -v '\.test\.' | grep -v '\.spec\.'

# 2. No value imports outside tests. Expect no output.
grep -rn "from '@solana/web3.js'" --include='*.ts' --include='*.tsx' . \
  | grep -v node_modules | grep -v '\.test\.'

# 3. No inline type imports outside tests. Expect no output.
grep -rn "import('@solana/web3.js')" --include='*.ts' --include='*.tsx' . \
  | grep -v node_modules | grep -v '\.test\.'

# 4. Declared only as a devDependency. Expect two lines, shared and extension.
grep -rn '"@solana/web3.js"' --include=package.json . | grep -v node_modules

# 5. Not in the web bundle. Expect 0.
pnpm --filter @salmon/web build:prod
grep -c "Invalid public key input" apps/web/dist/assets/index-*.js

# 6. Not in the extension bundle. Expect no output.
pnpm --filter @salmon/extension build:prod
grep -rl "Invalid public key input\|failed to get info about account" \
  apps/extension/dist/chrome-mv3/

# 7. The ratchet is armed. Add an import of @solana/web3.js to any non-test
#    .ts file and confirm this warns, then revert.
pnpm lint
```

Checks 5 and 6 grep for strings that only exist in web3.js v1: `Invalid public key input` comes from
the `PublicKey` constructor and `failed to get info about account` from `Connection.getAccountInfo`.
Both matched before this migration and neither matches after.
