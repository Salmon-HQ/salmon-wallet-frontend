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
pnpm test:coverage                   # what CI runs: each package has a coverage floor that only moves up
pnpm check:i18n                      # locale parity, missing keys and orphans
pnpm check:parity                    # every mobile component/screen has its DOM twin on one contract
pnpm check:dead-code                 # no unused export or file, every import declared in its own package.json
pnpm check:cycles                    # no import cycle at run time
pnpm check:single-kit                # one version of @solana/kit and of each @solana-program client in the lockfile
pnpm check:manifest                  # extension permissions match the reviewed baseline (after an extension build)
pnpm check:no-secrets                # nothing that looks like a seed phrase or a keypair in tracked files
pnpm check:hidden-unicode            # no zero-width, bidirectional or tag character in tracked files
pnpm check:powerups-bundle apps/extension/dist/chrome-mv3   # a Powerups-off build carries no Powerup (spec 027 §3)
pnpm check:fingerprint               # native surface unchanged since the last mobile binary, or expo.version bumped
```

Package names: `@salmon/shared`, `@salmon/ui`, `@salmon/mobile`,
`@salmon/extension`.

`pnpm install` points git at the hooks in `.githooks/`: the fast checks run
before each commit (a few seconds) and types and lint before each push. They
only bring CI's answer forward — CI is what blocks a merge — and
`--no-verify` skips them once.

## Pull requests

- Branch from `staging` and open the PR into `staging`; keep PRs focused on a
  single change. It is squash-merged, so the PR title becomes the commit.
- `main` is what is released. It takes changes only through a PR from
  `staging`, merged with a merge commit, never squash: `main` then shares
  `staging`'s history and the next release PR carries only what is new.
- A fix that cannot wait for the next release may go straight to `main` as an
  exception: branch from `main`, label the PR `exception`, and right after it
  merges, merge `main` into `staging` with a merge commit
  (`git switch staging && git merge origin/main`), run `pnpm typecheck`, then
  `git push origin staging`. Git can join two copies of the same new function
  without marking a conflict; the typecheck catches it. A merge built without
  a working tree is good only once CI passes on the push to `staging`.
- The `PR rules` workflow checks both: a conventional PR title, and that a PR
  into `main` comes from `staging` unless it carries the `exception` label.
- Conventional commits in English (`feat:`, `fix:`, `docs:`, `chore:`, ...).
- Run the targeted checks for every package you touched before opening the PR.
- Every user-facing string must exist in both English and Spanish locale files
  (`packages/shared/src/locales`) — see the i18n rules in `AGENTS.md`.
- Never include seed phrases, private keys, or real wallet credentials in code,
  tests, fixtures, or PR descriptions. Test secrets live in gitignored
  `.env.test` files.

### Automated review

A pull request from a branch of this repository also gets an automated reader
(`.github/workflows/agent-review.yml`): a model that sees the diff and the
rules in `AGENTS.md`, nothing else, and comments inline. Its comments are
advice; the required checks and a maintainer's review are what decide a merge.
A pull request from a fork is reviewed by a maintainer only, and its workflow
runs wait for a maintainer's approval.

## Reporting security issues

Do not open public issues for vulnerabilities. Contact the maintainers privately
(see the repository's security policy or the contact on salmonwallet.io).
