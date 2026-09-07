# Changelog

All notable, user-visible changes to the wallet apps are recorded here, newest first. Extension and mobile releases follow store submissions; the web wallet was retired on 2026-09-02. Each entry should list what a user or dApp developer can observe: new/changed flows, fixed bugs, behavior changes.

## Unreleased

### mobile

- Face ID unlock works again, and it is the same unlock the password takes. The keychain used to hold a session key tied to the vault, which a password change or a key-derivation upgrade silently orphaned — the switch still read "on" with nothing behind it. It now holds a random key with the password sealed under it, so nothing the wallet does to itself can break the enrolment.
- A Face ID prompt you dismiss no longer costs you the enrolment, and one the system destroys (a re-enrolment, a new fingerprint) now says so and points at where to turn it back on, instead of failing silently.
- The unlock wait no longer stutters: the wave used to be restarted from the beginning by any relayout behind it — the keyboard leaving, the Face ID sheet dismissing — so it went blank for about a second, twice, before settling.
- Unlocking no longer plays the same arrival twice. The screen behind the lock used to appear finished for one frame and only then float in.
- A send or swap that fails now lets its wait leave instead of cutting it mid-wave, and a retry starts clean.
- Updates are checked at launch and applied before the app opens.

## extension 0.13.2 — 2026-09-07

- Unlocking now caches the session key it was always meant to cache. The lock page was swapped out the instant the password was accepted, and that took with it the step that stored the key — so it was never stored at all.
- The unlock wave finishes instead of being cut off halfway, and the screen behind it arrives once rather than appearing and then animating.
- A send that fails lets its wait leave instead of cutting it mid-wave, so a retry starts clean.

## mobile 1.1.0 — 2026-09-03 — the redesign

- The whole app is redrawn: Home, Wallets, Activity, Send in four steps, token and NFT detail, Settings, onboarding and lock.
- Light and dark mode: Settings → Appearance (System / Light / Dark), persisted and applied live.
- Sending Bitcoin works. Every previous build failed before signing: a P2PKH input needs the transaction it spends, and no build ever had it. The wallet now reads it from the same public relays it broadcasts to, so no part of a Bitcoin send touches our servers.
- Derived accounts are wallets of their own, and you choose which to import.
- Developer mode returns: the screen follows the network you are standing on.
- The swap surface and the Powerups browser are closed for this release.

## extension 0.13.1 — 2026-09-03

- Sending Bitcoin from a wallet with many inputs no longer fails at the last step: the previous-transaction lookups go out a few at a time instead of all at once, which a public relay answers with a rate limit.

## extension 0.13.0 — 2026-09-03 — the extension becomes the mobile app, on the DOM

- The browser extension's side panel now draws the same screens as the mobile app — Home, Wallets, Activity, Send in four steps, token and NFT detail, Settings, onboarding and lock — with the same layout, copy and motion. Screens slide in from the right; sheets rise from the bottom.
- Light and dark mode on the extension: Settings → Appearance (System / Light / Dark), persisted and applied live.
- Developer mode on the extension: Settings → Developer Networks and Show unverified tokens, with the same behaviour as mobile; a wallet missing a test-network address gets it derived when the network is offered.
- The balance number is larger; the page cues sit to the right of the dots and turn the page when tapped; the Bitcoin page shows the wallet's actual BTC holding.
- NFT images that live on hotlink-guarded IPFS gateways now load on the extension.
- Send on Bitcoin broadcasts the signed transaction from the device to public relays (mempool.space, blockstream.info); an unknown outcome reads "Send unconfirmed", never "failed".
- Sending Bitcoin works. Every previous build failed before signing: a P2PKH input needs the transaction it spends, and no build ever had it. The wallet now reads it from the same public relays it broadcasts to, so no part of a Bitcoin send touches our servers.
- The web wallet is retired. The StealthEX bridge and the swap surface are removed from every app pending the Powerups boundary work.
- Under the hood: MUI left the codebase; the extension kit is emotion on the shared tokens; screen logic lives once in `packages/shared` for both platforms; a parity gate in CI keeps the two apps in step.

## 1.2.0 — 2026-08-12 (web)

- Token detail for SPL tokens now shows the price chart and the Info/About sections, resolved by contract address (mint) when the token has no CoinGecko id. Unlisted tokens hide those sections cleanly.
- Bridge amounts are validated against the pair maximum before creating an exchange.
- A corrupt stored vault now fails closed (lock is never skipped) instead of being treated as a legacy plaintext wallet.
- The dApp approval router in the extension rejects malformed messages and unknown methods with a fixed protocol error.

## 0.9.1 — 2026-08

- Baseline entry: changelog introduced. Earlier history lives in the git log and merged pull requests.
