# Research: A dApp connection that does not dead-end

## R1 — What the review hit (reproduced 2026-10-14)

Submitted APK 1.4.0 (versionCode 84) on the `Seeker_API35` emulator against `npx solana-mobile@latest playground` (0.6.0):

| Setup | Result |
| --- | --- |
| Wallet on mainnet, dApp on mainnet | Connect approval shown; approved; the page receives the address |
| Wallet on mainnet, dApp on devnet | "Request refused — asked for solana:devnet, a network your wallet is not using…"; no way forward |
| No wallet, dApp on mainnet | "Request refused — asked for solana:mainnet, a network your wallet is not using…" (wrong cause) |
| No wallet, first launch after install | Once: closed in 0.4 s with no screen, page shows "authorization request failed"; not reproduced in three later attempts |

The manifest is correct: `MwaActivity` is exported with both `solana-wallet` intent filters, and the intent resolves to it.

## R2 — What the protocol says about networks

Mobile Wallet Adapter spec (`authorize`): `chain` is optional and defaults to `solana:mainnet`; defined values are `solana:mainnet`, `solana:testnet`, `solana:devnet`, and the legacy `mainnet-beta`, `testnet`, `devnet` stay supported. A wallet that does not support the chain answers `ERROR_CHAIN_NOT_SUPPORTED` (-7). The spec says nothing about a wallet with no accounts.

- **Decision**: treat a supported chain the wallet is not on as an offer to switch; treat any other chain as unsupported, named in the message.
- **Rationale**: Salmon holds the same key on mainnet and devnet, so the switch is the user finishing what they asked for, not a new authorization.

## R3 — What the wallet library lets Salmon answer

`walletlib` 1.4.5 `MWARequestFailReason`: `USER_DECLINED`, `TOO_MANY_PAYLOADS`, `INVALID_SIGNATURES`, `AUTHORIZATION_NOT_VALID`. There is no chain-not-supported answer, and the native side always fills `request.chain`.

- **Decision**: unsupported and switch-declined both answer `USER_DECLINED`; the change is what the user reads.
- **Alternative rejected**: patching the native bridge to emit -7 — a fork of the library for a code the dApp would only show as an error.

## R4 — How the switch behaves

`changeNetwork(targetId)` (`useAccountsSelection`) returns without doing anything when the active account holds no slot on the target (`getHeldPathIndex` is null).

- **Decision**: offer the switch only when `getHeldPathIndex(account, target)` is not null; otherwise the precheck's existing network message stands.
- **Known limit**: the dApp activity has its own React root; a `MainActivity` already running keeps its in-memory network until it reloads. Same as any change made from the dApp activity today.

## R5 — Opening Salmon from the dApp activity

`MainActivity` declares the `salmonwallet` scheme; `MwaActivity` runs in its own task (`taskAffinity=""`), so `Linking.openURL('salmonwallet://')` brings the app's own task forward while the dApp activity finishes on the session end.

- **Decision**: open the app first, then decline; the decline ends the session and closes the dApp activity as every session end does.
