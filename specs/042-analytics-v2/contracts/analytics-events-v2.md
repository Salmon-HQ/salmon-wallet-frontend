# Contract: analytics ingest v2

The wallet (this repo) and `salmon-wallet-backend` enforce the same allow-list independently. Frontend source of truth: `packages/shared/src/analytics/events.ts`; backend mirror: `src/analytics/event-schema.js` and the platform list in `src/analytics/handler.js`. A change to either side changes both, backend first.

## Request

`POST {base}/v1/events`

- `{base}`: see "Routing" below.
- Headers: `Content-Type: text/plain;charset=UTF-8` (the body is JSON; the type keeps cross-origin calls free of a preflight). No other header.
- `keepalive: true` where the runtime supports it.
- Body (at most 100 events):

```json
{
  "context": {
    "installId": "uuid",
    "sessionId": "uuid",
    "platform": "ios | android | seeker | extension",
    "appVersion": "1.5.0"
  },
  "events": [{ "event": "app_opened", "props": {}, "ts": 1760900000000 }]
}
```

## Response (unchanged)

| Status | Body                                                                             | Client action                 |
| ------ | -------------------------------------------------------------------------------- | ----------------------------- |
| 202    | `{ "accepted": n, "rejected": m }`                                               | done                          |
| 202    | `{ "accepted": 0, "rejected": m, "buffered": false }` (sink failed)              | done                          |
| 400    | `{ "error": "invalid_json" \| "events_array_required" \| "no_valid_events", … }` | re-queue (any non-2xx throws) |
| 204    | OPTIONS                                                                          | —                             |

## Platforms

Accepted: `extension`, `ios`, `android`, `seeker`, and `mobile` (builds older than v2). Anything else is stored as `unknown`.

## Props

| Key                               | Values                                                                   |
| --------------------------------- | ------------------------------------------------------------------------ |
| `chain`, `from_chain`, `to_chain` | `solana`, `bitcoin`, `ethereum`                                          |
| `success`                         | boolean only (a string is rejected on both sides)                        |
| `amount_bucket`                   | `0-10`, `10-100`, `100-1k`, `1k-10k`, `10k+` (allowed, sent by no event) |
| `powerup`                         | `swap`, `payments`, `memo`, `skr`                                        |

Every string value is also rejected when it looks like an address or mint, or exceeds 32 characters.

## Events (20) and the props each call site sends

| Event                     | Props                                               | Platforms                  |
| ------------------------- | --------------------------------------------------- | -------------------------- |
| `app_opened`              | —                                                   | all                        |
| `wallet_created`          | —                                                   | all                        |
| `wallet_recovered`        | —                                                   | all                        |
| `first_send_completed`    | —                                                   | all                        |
| `send_completed`          | `chain`, `success`                                  | all                        |
| `nft_viewed`              | `chain`                                             | all                        |
| `nft_sent`                | `chain`, `success`                                  | all                        |
| `network_switched`        | `chain`                                             | all                        |
| `wallet_switched`         | —                                                   | all                        |
| `address_book_used`       | —                                                   | all                        |
| `powerup_installed`       | `powerup`                                           | all                        |
| `powerup_uninstalled`     | `powerup`                                           | all                        |
| `swap_completed`          | `from_chain: solana`, `to_chain: solana`, `success` | where Swap is offered      |
| `first_swap_completed`    | —                                                   | where Swap is offered      |
| `memo_sent`               | `success`                                           | all                        |
| `payment_request_created` | —                                                   | all                        |
| `payment_request_paid`    | —                                                   | all                        |
| `dapp_connected`          | —                                                   | extension, android, seeker |
| `dapp_message_signed`     | —                                                   | extension, android, seeker |
| `dapp_transaction_signed` | —                                                   | extension, android, seeker |

The guardrail checks keys and values, not which event carries which key; the per-event props are a call-site contract, held by the frontend tests.

## Routing (which `{base}` a build posts to)

| Build                                                                                                     | Store build?                          | `{base}`                                                                            |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| App Store / Google Play (`production`), sideload APK (`production-apk`), Solana dApp Store (`dapp-store`) | yes (EAS channel `production`)        | production API                                                                      |
| Chrome Web Store, Firefox Add-ons install                                                                 | yes (`installType` not `development`) | production API                                                                      |
| `dapp-store-test`, `staging`, `testflight`                                                                | no                                    | staging API                                                                         |
| Dev client, simulator, non-EAS Release build, Maestro run                                                 | no                                    | the local backend in local mode; staging when the build talks to the production API |
| Unpacked extension (dev, Playwright)                                                                      | no                                    | same rule as the line above                                                         |
| Any build with `EXPO_PUBLIC_ANALYTICS_URL` / `VITE_ANALYTICS_URL` set                                     | —                                     | that URL                                                                            |
