# AGENTS.md instructions for `packages/shared/src/blockchain`

Refines the repo-root `AGENTS.md` (canonical rules) for this folder.
Transaction building and signing paths in here are security-sensitive —
see the root `AGENTS.md` Security-sensitive areas section.

## Responsibility

- chain-specific logic shared across apps
- adapters and helpers for Solana, Bitcoin, and Ethereum domains

## Rules

- Keep chain concerns isolated by subfolder; no ad hoc helpers mixing
  chains — mixed-chain helpers make it impossible to reason about one
  chain's behavior in isolation.
- Reuse shared types and utilities instead of duplicating chain contracts
  in apps — duplicates drift and desync signing behavior across platforms.
- Preserve future-facing Ethereum surface unless removal is explicitly
  requested — it is intentional scaffolding for planned multi-chain
  support, not dead code.

## Testing

- Add or update chain-focused tests when shared blockchain behavior
  changes — a signing or parsing bug here ships to both apps.
