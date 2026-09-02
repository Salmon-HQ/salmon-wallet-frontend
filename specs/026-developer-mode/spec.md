# Feature Specification: Developer mode returns — the screen follows the network you stand on

**Feature Branch**: `feat/redesign-mobile-home` (spec dir `026-developer-mode`)
**Created**: 2026-09-02 · **Status**: Approved by the owner 2026-09-02 (every default confirmed by multiple choice), in implementation

## Owner rulings (2026-09-02)

1. **The toggle comes back** in Settings ("Developer Networks" — "Show testnet and devnet networks" / "Mostrar redes testnet y devnet", restored verbatim). The launch heal (`useDeveloperNetworksOff`) is deleted.
2. **The screen follows the network the user is standing on.** With the balance carousel on Solana devnet, everything shows devnet only: tokens, NFTs, activity, send, receive, token and NFT detail, explorer links. Same for Bitcoin testnet vs mainnet. Developer mode decides only **which networks are offered** in the carousel and the Network panel; it never decides what a surface shows once a network is active.
3. **On Bitcoin (any network) the NFTs sub-tab sinks away.** The row plays the verb; if NFTs was the active tab the content switches to Portfolio on the verb. Back on Solana it floats in. This holds with developer mode on or off, and the old "tap NFTs → snap the chain to Solana" is deleted.
4. **Coherent from account creation**: every creation path derives the test networks the way onboarding already does.

## Three audits, one root cause

`filterVisibleNetworks` in `packages/shared/src/hooks/useAvailableNetworks.ts:103-114` strips non-mainnet networks whenever the flag is off, and the carousel, the NFTs sections and the network chip key off **the flag** rather than **the active network**. Everything below follows from putting the active network (`networkId` in the accounts context, persisted under `salmon_active_network_id`) back in charge.

## Decisions (all confirmed by the owner, 2026-09-02)

| #   | Question                  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Network model             | Each network is one carousel page; the whole screen follows it. The NFTs grid's separate "Devnet" section is gone.                                                                                                                                                                                                                                                                                                                                         |
| 2   | Account creation          | Always derive mirrors at creation (onboarding already does: `password.tsx:251-259`); `AccountAddPanel` and `useDerivedAccountsScan` append `getMirrorNetworks()` to their `networkIds` so every wallet holds every enabled network. Existing wallets missing a mirror get it derived lazily the first time that network is offered to them (from the seed in memory, `deriveBlockchainAccount` + `editAccount`), never silently dropped from the carousel. |
| 3   | Derived-accounts scan     | Stays mainnet-only; an imported derived wallet gets its test addresses through #2.                                                                                                                                                                                                                                                                                                                                                                         |
| 4   | Spam / unverified tokens  | Decoupled: a second Settings toggle "Show unverified tokens" (`UserConfig.showUnverifiedTokens`, default off) drives `includeSpam` everywhere the flag drove it (Home balance, prefetch, NFTs, Send, NFT detail, wallet totals). Developer mode no longer touches spam.                                                                                                                                                                                    |
| 5   | Test-network signal       | The chip ("Devnet", "Testnet", "Sepolia" from `getNetworkLabel`) shows whenever the active network is not mainnet — in the balance block beside the dots and in `WalletHeader`'s address line — regardless of the flag (DESIGN.md §Chain identity: a non-mainnet environment always keeps a text chip).                                                                                                                                                    |
| 6   | Sending on a test network | No extra gate; the chip is the warning. The Receive sheet shows the environment label under the QR.                                                                                                                                                                                                                                                                                                                                                        |
| 7   | NFTs on Bitcoin           | As ruled: the tab sinks, content falls back to Portfolio on the verb, the snap-to-Solana is deleted.                                                                                                                                                                                                                                                                                                                                                       |

## Placement

- **shared**: `useAvailableNetworks` (offer = enabled networks ∩ networks the wallet holds, plus non-mainnet only when the flag is on **or the persisted active network is already that non-mainnet network** — so toggling the flag off never strands a session on a hidden page: the switch moves the active network to the mainnet sibling first), `useUserConfig` (`showUnverifiedTokens`), `useCoinMarketData` (`networkId` param; disabled off-mainnet), `config/explorers.ts` (a `solana-devnet` map with `?cluster=devnet`), `useAccountsLoader` first-launch default (the first network the wallet holds, mainnet preferred), the lazy mirror derivation helper, deletion of the dead duplicates (`utils/network.ts filterNetworks`, `utils/nft.ts getVisibleNftSectionKeys`) in favour of the live implementations — or the reverse, one implementation each.
- **mobile**: `DeveloperModeProvider` hoisted to `app/(app)/_layout.tsx` (one `useUserConfig` instance feeds the context; `panelRegistry` reads the context, not its own instance); Settings row restored; `NftsTab` rebuilt to follow `networkId` (one grid, no sections, the devnet banner becomes the chip rule); `nft/[id]` derives its network from the accounts context and validates the `section` param against it; `WalletHeader` and `BalanceHeader` chip; `ReceiveSheet` environment label; swap tab hides itself off-Solana instead of coercing; Home's Bitcoin check uses `getBlockchainFromNetworkId`; the NFTs sub-tab presence follows the active chain family with the verb; `TransactionDetailDeveloper` and Powerups mocks read the real flag; the header's 8-char address stays flag-driven.
- **web/extension**: they consume the shared hooks and get the offer/chip logic for free; their prop-drilled flag is out of scope.

## Tests

- shared: offer logic (flag off → mainnet only unless the active network is non-mainnet; flag on → all held networks; toggling off moves a devnet session to mainnet), lazy mirror derivation persists once, explorer devnet URLs, prices disabled off-mainnet, `showUnverifiedTokens` round-trip.
- mobile: one test that renders through the real `(app)` stack and asserts `useDeveloperMode()` resolves the stored flag from Activity, Send, NFT detail and Powerups (the class the current mocks cannot catch); NFTs grid queries the active network only; Bitcoin → NFTs tab gone with the verb, Portfolio active; back to Solana → tab returns; chip present off-mainnet with the flag off; Settings row toggles and persists.

## Verification

`pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/mobile`, then `pnpm format:check`, full turbo, `node scripts/check-i18n.mjs`. Owner review on device: a wallet with devnet NFTs, standing on devnet, sees only devnet everywhere; on Bitcoin the NFTs tab sinks; with the flag off and a devnet session open, the app lands on mainnet.

## Confirmed on 2026-09-02 (multiple choice)

- Creation derives mirrors always; older wallets derive lazily when offered.
- Unverified tokens: their own toggle, default off; developer mode only offers networks.
- Chip in the balance block and the header whenever the active network is not mainnet.
- Sending on a test network: no extra gate; Receive labels the environment.
- Derived-accounts scan stays mainnet-only.
- Turning developer mode off while on devnet moves the session to the mainnet sibling first.
- Test-network tokens show no USD price (em-dash), never the mainnet token's price.
- Delivery: two sequential lots — shared first, then mobile.
