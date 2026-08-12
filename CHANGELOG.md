# Changelog

All notable, user-visible changes to the wallet apps are recorded here, newest first. Web releases are tag-driven (`web/v*` from `main` — see `.github/workflows/deploy-web.yml`); extension and mobile releases follow store submissions. Each entry should list what a user or dApp developer can observe: new/changed flows, fixed bugs, behavior changes.

## Unreleased

## 1.2.0 — 2026-08-12 (web)

- Token detail for SPL tokens now shows the price chart and the Info/About sections, resolved by contract address (mint) when the token has no CoinGecko id. Unlisted tokens hide those sections cleanly.
- Bridge amounts are validated against the pair maximum before creating an exchange.
- A corrupt stored vault now fails closed (lock is never skipped) instead of being treated as a legacy plaintext wallet.
- The dApp approval router in the extension rejects malformed messages and unknown methods with a fixed protocol error.

## 0.9.1 — 2026-08

- Baseline entry: changelog introduced. Earlier history lives in the git log and merged pull requests.
