# AGENTS.md instructions for `packages/shared/src/api`

Refines the repo-root `AGENTS.md` (canonical rules) for this folder.
This folder is the canonical frontend contract with the backend
(`../salmon-wallet-backend`) — verify consumer impact before changing request or
response assumptions.

## Responsibility

- shared backend client configuration
- shared API services and adapters used across apps

## Rules

- Centralize backend-facing contracts here when they are consumed by
  multiple apps — one contract keeps both apps in sync with the
  backend.
- Keep endpoint wrappers and shared client behavior here instead of
  reimplementing them in apps — app-local copies drift when the backend
  changes.
- If an endpoint change affects frontend behavior, check the sibling
  backend repo `../salmon-wallet-backend` — the two repos must agree on the wire
  contract.

## Testing

- Add or update focused API-service tests when request/response behavior changes.

### Live integration tests (dev-machine smoke tests)

Some test files (`bitcoin.test.ts`, `solana.test.ts`, `solana-nft.test.ts`,
`dapp.test.ts`, `transactions.test.ts`, `network.test.ts`,
`price.test.ts`, `swap.test.ts`) probe a local salmon-api via
`getReachableBackendBaseUrl()` (`src/api/test-backend.ts`) and only exercise
the live contract when the backend is reachable on one of the candidate URLs.

These are **dev-machine smoke tests by design** — CI does not stand up the
backend, so the live blocks silently skip there. Schema drift is caught the
next time a contributor runs the suite locally against a running salmon-api.

Override the candidate list with `EXPO_PUBLIC_API_URL` / `VITE_API_URL` /
`API_URL` (or `*_API_HOST` + `*_API_PORT`) when targeting a non-default host.
