# Contributing to Salmon Wallet

Thanks for your interest in contributing. This document covers the basics for
getting a change merged.

## Before you start

- Read `AGENTS.md` — it is the canonical source for repo rules, package
  ownership boundaries, and placement decisions.
- For anything touching `packages/shared/src/crypto`, `packages/shared/src/storage`,
  or transaction signing paths in `packages/shared/src/blockchain`: open an issue
  first. These areas are security-critical and require owner review (see
  `.github/CODEOWNERS`).

## Development setup

```bash
pnpm install
pnpm turbo run typecheck lint test   # full check, or scope with --filter=@salmon/<pkg>
pnpm check:i18n                      # locale parity, missing keys and orphans
```

Package names: `@salmon/shared`, `@salmon/ui`, `@salmon/mobile`, `@salmon/web`,
`@salmon/extension`.

## Pull requests

- Branch from `main`; keep PRs focused on a single change.
- Conventional commits in English (`feat:`, `fix:`, `docs:`, `chore:`, ...).
- Run the targeted checks for every package you touched before opening the PR.
- Every user-facing string must exist in both English and Spanish locale files
  (`packages/shared/src/locales`) — see the i18n rules in `AGENTS.md`.
- Never include seed phrases, private keys, or real wallet credentials in code,
  tests, fixtures, or PR descriptions. Test secrets live in gitignored
  `.env.test` files.

## Reporting security issues

Do not open public issues for vulnerabilities. Contact the maintainers privately
(see the repository's security policy or the contact on salmonwallet.io).
