# Contract: the two third-party reads the device makes

The manifest's `endpoints` are exactly these two hosts (FR-004). Neither read ever produces transaction bytes (`docs/POWERUPS-UI.md` §2, "direct third-party reads").

## 1. `devnet.json`

`GET https://raw.githubusercontent.com/inkwell-finance/pc-wallet-kit/main/devnet.json`, plain `fetch`, on tab mount and on retry. Accepted only when all hold (research R8; source copy at main `941a65a`, epoch 2):

| Field | Required value |
| --- | --- |
| `cluster` | `devnet` |
| `programs.encrypt` | `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8` |
| `programs.pcToken` | `3kjJEx6G1XdrtixFg9f8eGRAyzW5QmhsJQq6qCUZYhXZ` |
| `programs.pcSwap` | `BqJMtWQYiis1264KqBN3wssNqTofK5RuP67hkZYvb4SD` |
| `encryptGrpcUrl` | `https://pre-alpha-dev-1.encrypt.ika-network.net:443` (port optional) |
| `sides.USDC`, `sides.DOGE` | present, `decimals: 2`, base58 `splMint`, `pcMint`, `vault`, `vaultAta` |
| `layout.pcAccountBalanceCtOffset` | `[64, 96]` |
| `layout.ciphertextDigestOffset` | `[2, 34]` |
| `layout.ciphertextVerifiedFlagByte` | `99` |
| `faucetUrl` | `null` or an https URL (non-null shows "Get test tokens", FR-011) |

Anything else: the tab's unavailable state with retry; no cached or default copy.

## 2. Encrypt executor `ReadCiphertext`

One unary gRPC-web call, no streaming (research R7; wire facts from the vendored `encrypt_service.ts` and `spike/probe.mjs:33-51`).

Request:

```text
POST {encryptGrpcUrl without :443}/encrypt.v1.EncryptService/ReadCiphertext
content-type: application/grpc-web+proto
x-grpc-web: 1
accept: application/grpc-web+proto

body = 0x00 ‖ u32 BE (len) ‖ protobuf
protobuf = field 1 bytes message (43 B) ‖ field 2 bytes signature (64 B) ‖ field 3 bytes signer (32 B)
```

`message`, `signature`, `signer` are `SignedResult.readAuthorization` from core, unchanged.

Response: read with `arrayBuffer()`; frames of `type u8 ‖ u32 BE len ‖ payload`; type `0x00` is the message, type `0x80` is trailers text. Status is `grpc-status` from the headers or the trailer; anything but `0` is an error (the spike saw `7`, "signer is not authorized to read this ciphertext"). Message fields: 1 `value` (bytes), 2 `fheType` (uint32), 3 `digest` (bytes).

Decoding: `value` as u64 little-endian; fewer than 8 bytes is an error, never 0 (FR-031, GUIDE §5 step 6). The amount is in base units with 2 decimals.

Timing: call only after the reveal's `viewCt` is settled (`data[99] === 1`, GUIDE §5 step 4); the executor answered in ~1.4 s in the spike.
