# Contract: the backend's one change

Repo `../salmon-wallet-backend`, branch `feat/powerups-foundations`.

## `src/services/solana/powerups/registry.js`

```js
// Read-only entry: the wallet asks and pays on the device; the backend only lists it.
payments: {
  tier: 'core',
  networks: ['solana-mainnet', 'solana-devnet'],
  contributor: null,
  endpoints: [],
},
```

## `src/network-capabilities/network-capabilities-{local,develop,main,prod}.js`

`powerups.payments.enabled: true` on every stage (the owner may flip `prod` to `false` until the client ships; the client renders the disabled reason if given).

## Observable contract

`GET /v1/networks` → each Solana entry's `powerups[]` includes `{ id: 'payments', enabled: true }` (or `enabled: false, reason`). `GET /v1/{networkId}/powerups/payments/build` → 404 (no adapter). Tests: the catalog service spec gains the id; the router spec asserts the 404.

Nothing about a payment request or a settlement ever reaches the backend.
