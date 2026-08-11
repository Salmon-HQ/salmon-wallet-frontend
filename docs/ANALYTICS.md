# Pseudonymous analytics — event catalog and metrics

This document is the reference for **what we measure, with what data, and what metrics can be computed from it**. It is a *ground-truth* document: it marks what is actually emitted today and, explicitly, what **cannot** be measured with the current design. It does not promise coverage that does not exist.

## Privacy posture

Analytics are **pseudonymous and opt-in** — the persistent `install_id` singles out a device across events (that is what makes funnels work), so the data is pseudonymous rather than anonymous in the GDPR sense, and consent is required. The user starts with no consent and the client is a **total no-op** until it is granted: it does not validate, does not enqueue, does not persist, and does not send anything.

Payload safety is guaranteed by an **allow-list, not a deny-list**:

- Only the 11 catalog events may be emitted.
- An event may only carry props from `ALLOWED_PROP_KEYS`.
- A guardrail rejects any value that looks like an address or mint (base58 32–44, hex 0x+40), raw numbers, and long strings (>32 chars).
- **Never** does an address, an exact amount, a mint, or anything derived from the seed travel.

Validation runs **twice, independently**: on the client before sending, and again on the backend at ingest (defense in depth — a tampered or outdated client cannot sneak PII through).

Withdrawing consent **clears the queue and the install id**.

## Where each thing lives

| Piece | Location |
|---|---|
| Catalog (source of truth) | `packages/shared/src/analytics/events.ts` |
| Payload guardrail | `packages/shared/src/analytics/schema.ts` |
| Client (consent, batching, retry) | `packages/shared/src/analytics/client.ts` |
| HTTP transport | `packages/shared/src/analytics/transport.ts` |
| "First-time" events | `packages/shared/src/analytics/first-time.ts` |
| Consent hook | `packages/shared/src/hooks/useAnalyticsConsent.ts` |
| Backend mirror | `salmon-api/src/analytics/event-schema.js` |
| Backend ingest | `salmon-api/src/analytics/handler.js` (`POST /v1/events`) |

> The wallet catalog and the `salmon-api` mirror **must be kept in sync**. A change in one forces the other.

## Context attached to every event

Not sent by each event: the batch envelope and the handler add it.

| Field | What it is |
|---|---|
| `install_id` | Random per install. **Not** derived from the wallet or the seed. |
| `session_id` | Ephemeral, rotates per session. |
| `platform` | `mobile` \| `web` \| `extension` |
| `app_version` | App version. |
| `ts` | Client epoch ms (when it happened). |
| `received_at` | Server epoch ms (when it was ingested). |
| `dt` | `YYYY-MM-DD` — partition key. |

## Allowed props

Only these five keys. Anything else is rejected.

| Prop | Values |
|---|---|
| `chain` | `solana` \| `bitcoin` \| `ethereum` |
| `from_chain` | same |
| `to_chain` | same |
| `success` | `true` \| `false` |
| `amount_bucket` | `0-10` \| `10-100` \| `100-1k` \| `1k-10k` \| `10k+` |

## Catalog: the 11 events

Events are wired **in the shared hook when one exists**, so a single call covers mobile + web + extension. UI-dependent ones are wired in the mobile screen and in the shared DOM component.

### Onboarding

| Event | Props | Fires on | Wired in |
|---|---|---|---|
| `wallet_created` | — | Password success, `create` flow | `apps/mobile/app/(auth)/password.tsx` + `packages/ui/.../AuthFlow/PasswordPage.tsx` |
| `wallet_recovered` | — | Password success, `recover` flow | same |

### Activation (once per install)

These use `trackFirstTime()`: they emit the event **once**, guarded by a persisted flag per event. The flag is **only consumed once the event actually emitted** (i.e. with consent granted), so a user who does their first swap *before* opting in is still counted on their first swap *after* opting in.

| Event | Props | Fires on | Wired in |
|---|---|---|---|
| `first_send_completed` | — | 1st successful send | `packages/shared/src/hooks/useSendTransaction.ts` |
| `first_swap_completed` | — | 1st successful swap (Jupiter or bridge) | `useSwap.ts` + `contexts/BridgeSettlementContext.tsx` |

### Recurring use

| Event | Props | Fires on | Wired in |
|---|---|---|---|
| `send_completed` | `chain`, `success` | Transfer outcome (success **or** failure) | `packages/shared/src/hooks/useSendTransaction.ts` |
| `swap_completed` | `from_chain`, `to_chain`, `success` | Swap outcome. Jupiter (Solana↔Solana) fires immediately in `useSwap`; a cross-chain **bridge** fires on its real settlement, with the real chains, from the background poller | `useSwap.ts` + `contexts/BridgeSettlementContext.tsx` |
| `nft_viewed` | `chain` | Open NFT detail | `apps/mobile/.../NftDetailSheet.tsx` + `packages/ui/.../NftDetailPage.tsx` |
| `nft_sent` | `chain` | Successful NFT transfer | `packages/shared/src/hooks/useNftTransfer.ts` |

### Feature adoption

| Event | Props | Fires on | Wired in |
|---|---|---|---|
| `network_switched` | `chain` (destination network) | `changeNetwork` | `packages/shared/src/hooks/useAccountsSelection.ts` |
| `wallet_switched` | — | `changeAccount` | `packages/shared/src/hooks/useAccountsSelection.ts` |
| `address_book_used` | — | `addContact` | `packages/shared/src/hooks/useAddressbook.ts` |

## Metrics per event

What we will compute with each one.

### Activation and time-to-value

| Metric | How it is computed |
|---|---|
| Send activation rate | `installs with first_send_completed / consented installs` |
| Swap activation rate | `installs with first_swap_completed / consented installs` |
| Time-to-first-send / swap | `ts` of the `first_*` − `ts` of that `install_id`'s first event |
| Activation order | Which `first_*` happens first per `install_id` (do they swap before sending?) |

### Recurring use and engagement

| Metric | How it is computed |
|---|---|
| Send / swap volume | `count(send_completed)`, `count(swap_completed)` by `dt` |
| Chain mix | `count(send_completed) group by chain` — which chains actually get used |
| Sends per active user | `count(send_completed) / count(distinct install_id)` |
| Send vs swap ratio | Which operation type dominates |
| NFT usage | `nft_viewed` → `nft_sent` (NFT view-to-send), by `chain` |

### Retention

| Metric | How it is computed |
|---|---|
| DAU / WAU / MAU | `count(distinct install_id) by dt` (or window) |
| D1 / D7 / D30 retention | Cohorts by each `install_id`'s first seen `dt` |
| Stickiness | `DAU / MAU` |
| Session depth | `count(events) group by session_id` |
| Sessions per install | `count(distinct session_id) group by install_id` |

### Feature adoption

| Metric | How it is computed |
|---|---|
| % multi-chain | `installs with network_switched / total`, and which `chain` they switch to |
| % multi-wallet | `installs with wallet_switched / total` |
| % using address book | `installs with address_book_used / total` |
| Feature discovery | Which features an install touches in its first N days |

### Cross-cuts

Everything above can be segmented by `platform` (mobile / web / extension) and by `app_version` (to catch regressions or track release adoption).

## Known limitations (read before designing a metric)

### 1. The first-time onboarding funnel is NOT measurable

The consent screen is at the **end** of onboarding:

```
welcome → create/recover → password → biometric → CONSENT → app
```

Since the client is a no-op without consent, on the **first** onboarding the events `wallet_created` and `wallet_recovered` are **not emitted**. They only appear when an **already-consented** user goes through that flow again (e.g. adds a second account).

Consequence: those 2 events measure *"a consented user redoing the flow"*, **not acquisition or onboarding conversion**. Do not use them as a top-of-funnel.

This is correct by design (real opt-in: you cannot measure someone who has not yet consented). To measure the acquisition funnel you would have to move the consent prompt **earlier** in the flow — a product/legal decision, not a technical one.

### 2. Outcome rate yes, attempt funnel no

`send_completed` and `swap_completed` now fire on **both** paths — `success: true` on completion and `success: false` on failure (send/swap error path; bridge `fail`/`refunded` settlement). So a completion-vs-failure rate **is** computable.

What is still missing is an *attempt* event: a user who abandons before submitting the operation is never counted. So `success` gives you the outcome rate among **submitted** operations, not a full funnel conversion rate. Add attempt events to the catalog if you need the latter.

### 3. `amount_bucket` is defined but not emitted

The prop exists in the allow-list and the `toAmountBucket()` helper is already in `events.ts`, but **no event sends it today**. You cannot segment send/swap by operation size until it is passed in `useSendTransaction` / `useSwap`.

### 4. No identity, no value

By design there is no way to: attribute to a real user, cohort by wallet, measure balances/TVL, or tie events to an address. `install_id` is lost if the user reinstalls or withdraws consent.

## Verification status

**The catalog events** were verified **end-to-end** against the local `salmon-api` stack (app → `POST /v1/events` → NDJSON), with the correct props:

```json
{"event":"send_completed","props":{"chain":"solana","success":true}}
{"event":"swap_completed","props":{"from_chain":"solana","to_chain":"solana","success":true}}
{"event":"network_switched","props":{"chain":"bitcoin"}}
{"event":"nft_sent","props":{"chain":"solana"}}
{"event":"nft_viewed","props":{"chain":"solana"}}
```

This includes real on-chain transactions (send, swap, and NFT transfer).

> Verifying `nft_sent` uncovered a real bug: the wallet sent a plain SPL transfer, which **always** fails on a programmable NFT (pNFT) with `Account is frozen` (error 0x11) — pNFTs keep their token account frozen on purpose. It was fixed by building the transaction on the backend with Metaplex `transferV1`. The event was not being emitted because the transfer genuinely failed: the instrumentation was correct, it did not invent successes.

The catalog was trimmed from 15 to **11 events**: `onboarding_started` was removed (it never emitted — it runs before consent), `biometric_enabled` (mobile-only, no shared site), `settings_opened` (much noise, little signal), and `first_receive_viewed` (poor activation proxy). With that the unmeasurable events are gone, so the ceiling today is **11/11 even** on the web platforms.

Platforms:

- **Extension** and **Web**: verified end-to-end against the local ingest, with Playwright. All 11 land in the NDJSON with a single `install_id` per run — 6 non-on-chain (`analytics-coverage.spec.ts`) and 5 with real mainnet transactions (`analytics-coverage-onchain.spec.ts`, gated by `SALMON_E2E_ONCHAIN=1`).
- **iOS**: verified via Maestro (`apps/mobile/.maestro/`) against the previous catalog; the 4 removed events simply stop firing. Not re-run after the trim.
- **Android**: shares the JS bundle; not re-verified this round.

> The web on-chain spec does **one** swap leg, not a round-trip: `swap_completed` and `first_swap_completed` both fire on the first leg, and the return leg only added fragility (the form balance does not refresh within the session after a swap, and the just-bought token takes time to index). It is a **manual** spec: before running it, look at the holdings and size the leg to the $1 minimum (the same criterion the extension spec already documents).

Events fire from the committed flows in `apps/mobile/.maestro/`. Since consent is *declined* by default in `subflows/onboard-walletA.yaml`, for the suite to emit events you must opt in: use `subflows/enable-analytics.yaml` (Settings toggle) or, for a verification run, temporarily change that `tapOn` to `analytics-consent-accept`.

> **Watch out for the flush**: the client batches (20 events or 30s). If you chain flows, the next one's `clearState` kills the in-memory queue and events are lost. Run one flow at a time and wait ~35s before the next.

## Local verification

The local `salmon-api` stack (`docker-compose.yml`) serves the wallet API **and** the analytics ingest on the same port, with a file-sink to NDJSON:

```bash
# in ../salmon-api
docker compose up -d           # mysql + redis + backend (serverless-offline)
```

The backend exposes `POST /local/v1/events`. With `ANALYTICS_SINK=file` (already set in the compose) events are appended to `.analytics-local/events.ndjson`.

Point the app at the local stack:

```bash
# in apps/mobile — the IP must be the host LAN, not localhost (iOS Simulator)
EXPO_PUBLIC_API_URL=http://<LAN-IP>:<PORT>/local npx expo start --clear
```

Since the transport posts to `${API_URL}/v1/events`, events travel over the same base and land in the local NDJSON.

If you need to send events to a **different** sink than the wallet backend (e.g. wallet against prod but events local), there is an optional dedicated URL:

```bash
EXPO_PUBLIC_ANALYTICS_URL=http://<LAN-IP>:4319   # VITE_ANALYTICS_URL on web/ext
```

When set, the transport posts there instead of to `API_URL`.

Inspect what was ingested:

```bash
cat ../salmon-api/.analytics-local/events.ndjson | jq -r .event | sort | uniq -c
```

## Where the data goes

Once emitted (with consent), a batch is POSTed to an **isolated ingest Lambda** (`salmon-api/src/analytics/handler.js`), separate from the wallet API so a traffic spike cannot compete with it. The backend re-validates the batch against the allow-list and forwards it to **Google Analytics 4** via the Measurement Protocol.

The privacy posture holds end-to-end. The handler never reads the client IP, and because GA4 attributes an event to whoever calls it — the backend — **the user's IP never reaches Google; only the server's does.** No Google or Firebase SDK runs in the app, so no device ever talks to Google directly. Each event carries `client_id = install_id`: a random, PII-free per-install token, the only persistent identifier involved.

Delivery is best-effort: the Measurement Protocol answers `2xx` for a well-formed request without validating event contents, so a data point can be lost server-side without an error. It can also be lost **before it leaves the device** — if the app is closed before the batch flushes, that in-memory queue is dropped (it is not persisted). Both are the inherent trade-off of lightweight pseudonymous analytics. See `salmon-api/docs/ANALYTICS.md` for the sink and the one-time GA4 console setup.

The infrastructure that stores and serves this data is documented separately for operators (it is not needed to understand what the wallet collects).
