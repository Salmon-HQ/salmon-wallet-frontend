# Security Policy

This repository contains the client applications of a self-custodial cryptocurrency wallet. Security reports are taken seriously and handled with priority.

## Reporting a vulnerability

**Do not open a public issue for security problems.**

Report vulnerabilities privately through **GitHub Security Advisories**: go to the repository's **Security** tab → **Report a vulnerability**. Only repository administrators can see the report, and the discussion stays private until a fix ships.

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce (app and platform, screen or flow, payload if relevant).
- Any suggested remediation, if you have one.

You can expect an acknowledgement within a few business days. Please give us a reasonable window to ship a fix before any public disclosure.

## Scope

In scope: everything shipped from this repository — the mobile app (`apps/mobile`), browser extension (`apps/extension`), and the shared packages (`packages/shared`, `packages/ui`), with special priority for key material and seed handling (`packages/shared/src/crypto`, `packages/shared/src/storage`), transaction building and signing (`packages/shared/src/blockchain`), and the dApp approval flows.

Signed transactions are broadcast client-side and never reach our backend: the wallet posts the
raw signed Bitcoin transaction straight to a public relay (mempool.space, with blockstream.info as
a fallback), and Solana transactions go straight to the RPC.

Out of scope: the backend API (separate repository — report there), third-party providers the wallet consumes (Jupiter, CoinGecko, Helius, Triton), and social engineering.

## Notes for maintainers

- Private vulnerability reporting is a GitHub feature for **public** repositories. While this repository is private it cannot be enabled; when the repository goes public, an admin must turn it on once under **Settings → Advanced Security → Private vulnerability reporting**.
- Never commit seed phrases, private keys, or real wallet credentials — including in tests and fixtures. Test secrets live in gitignored `.env.test` files (see `CONTRIBUTING.md`).
