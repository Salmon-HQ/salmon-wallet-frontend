# Changelog

All notable, user-visible changes to the wallet apps are recorded here, newest first. Extension and mobile releases follow store submissions; the web wallet was retired on 2026-09-02. Each entry should list what a user or dApp developer can observe: new/changed flows, fixed bugs, behavior changes.

## Unreleased

### 2026-09-02 — the extension becomes the mobile app, on the DOM

- The browser extension's side panel now draws the same screens as the mobile app — Home, Wallets, Activity, Send in four steps, token and NFT detail, Settings, onboarding and lock — with the same layout, copy and motion. Screens slide in from the right; sheets rise from the bottom.
- Light and dark mode on the extension: Settings → Appearance (System / Light / Dark), persisted and applied live.
- Developer mode on the extension: Settings → Developer Networks and Show unverified tokens, with the same behaviour as mobile; a wallet missing a test-network address gets it derived when the network is offered.
- The balance number is larger; the page cues sit to the right of the dots and turn the page when tapped; the Bitcoin page shows the wallet's actual BTC holding.
- NFT images that live on hotlink-guarded IPFS gateways now load on the extension.
- Send on Bitcoin broadcasts the signed transaction from the device to public relays (mempool.space, blockstream.info); an unknown outcome reads "Send unconfirmed", never "failed".
- The web wallet is retired. The StealthEX bridge and the swap surface are removed from every app pending the Powerups boundary work.
- Under the hood: MUI left the codebase; the extension kit is emotion on the shared tokens; screen logic lives once in `packages/shared` for both platforms; a parity gate in CI keeps the two apps in step.

## 1.2.0 — 2026-08-12 (web)

- Token detail for SPL tokens now shows the price chart and the Info/About sections, resolved by contract address (mint) when the token has no CoinGecko id. Unlisted tokens hide those sections cleanly.
- Bridge amounts are validated against the pair maximum before creating an exchange.
- A corrupt stored vault now fails closed (lock is never skipped) instead of being treated as a legacy plaintext wallet.
- The dApp approval router in the extension rejects malformed messages and unknown methods with a fixed protocol error.

## 0.9.1 — 2026-08

- Baseline entry: changelog introduced. Earlier history lives in the git log and merged pull requests.
