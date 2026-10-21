# Quickstart: verifying analytics catalog v2 (FR-020)

Order: unit gates → local end to end (NDJSON) → staging → production. Every step runs against a backend that already has the v2 allow-list (`salmon-wallet-backend` branch `feat/analytics-catalog-v2`, then its release).

```bash
export PATH="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.21.0/bin:$PATH"
```

## 1. Unit and repo gates

```bash
pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/mobile --filter=@salmon/extension
pnpm check:i18n && pnpm check:parity
pnpm --filter @salmon/mobile fingerprint:check          # must pass unchanged: JS-only
pnpm --filter @salmon/extension build && pnpm check:manifest   # no permission change
# backend, in ../salmon-wallet-backend on feat/analytics-catalog-v2
npm test -- src/analytics
```

## 2. Local backend and NDJSON

```bash
# in ../salmon-wallet-backend (branch feat/analytics-catalog-v2)
docker compose up -d
: > .analytics-local/events.ndjson                        # start each run empty
# tally after a run
jq -r '[.platform, .event, (.props|tostring)] | @tsv' .analytics-local/events.ndjson | sort | uniq -c
```

Probe the allow-list with every new event before building anything (same body for staging, §6):

```bash
cat > /tmp/v2-batch.json <<'JSON'
{"context":{"installId":"probe","sessionId":"probe","platform":"seeker","appVersion":"1.5.0"},
 "events":[
  {"event":"app_opened","props":{},"ts":1},
  {"event":"powerup_installed","props":{"powerup":"memo"},"ts":1},
  {"event":"powerup_uninstalled","props":{"powerup":"skr"},"ts":1},
  {"event":"swap_completed","props":{"from_chain":"solana","to_chain":"solana","success":false},"ts":1},
  {"event":"first_swap_completed","props":{},"ts":1},
  {"event":"memo_sent","props":{"success":true},"ts":1},
  {"event":"payment_request_created","props":{},"ts":1},
  {"event":"payment_request_paid","props":{},"ts":1},
  {"event":"dapp_connected","props":{},"ts":1},
  {"event":"dapp_message_signed","props":{},"ts":1},
  {"event":"dapp_transaction_signed","props":{},"ts":1}]}
JSON
curl -s -X POST -H 'Content-Type: text/plain' --data @/tmp/v2-batch.json http://127.0.0.1:3001/local/v1/events
# expect {"accepted":11,"rejected":0}; repeat with platform ios, android, extension, mobile
```

## 3. Extension (Playwright, Chromium)

1. For a LIVE run that lands in the local NDJSON, create the gitignored `apps/extension/.env.production.local` with `VITE_ANALYTICS_URL=http://127.0.0.1:3001/local`, then `pnpm --filter @salmon/extension build`. Delete the file afterwards and rebuild before any other use.
2. `SALMON_ANALYTICS_LIVE=1 SALMON_API_URL=http://127.0.0.1:3001/local pnpm --filter @salmon/extension e2e analytics-coverage` — covers `app_opened`, `powerup_installed`/`powerup_uninstalled` (Memo from the catalogue, removed from the Home tab sheet), `payment_request_created`, `memo_sent` (devnet), and the dApp events from `scripts/test-dapp.html` (connect, sign message, sign-in, sign transaction, one denial). Specs intercept with `context.route`, so approval windows are seen.
3. SC-002: the spec approves 10 requests whose windows close at once and expects 10 dApp events in the NDJSON.
4. Checks on every batch: `platform` is `extension`; the body contains no address and no test-dApp origin; denial adds nothing.
5. On-chain (`analytics-coverage-onchain.spec.ts`, `SALMON_E2E_ONCHAIN=1`): `swap_completed` + `first_swap_completed` need a real mainnet swap. The owner confirms before it runs.
6. Routing: build without the override and load `dist/chrome-mv3` unpacked; with analytics on, the extension's network panel shows `/v1/events` going to the **staging** host.
7. Firefox: load `dist/firefox-mv2` through `about:debugging`; same check (R1, unverified).

## 4. Android emulator (`Seeker_API35`, dev client, Maestro)

```bash
adb reverse tcp:3001 tcp:3001     # app → local backend
cd apps/mobile && npx expo start --dev-client < /dev/null    # not CI=1: Metro needs watch mode
cd apps/mobile/.maestro           # Maestro runs from here
```

Run one flow at a time and wait ~35 s between flows (the queue is in memory). Opt in first (`subflows/enable-analytics.yaml`).

- Opens: launch → one `app_opened`; Home → background → reopen → a second one with a new `session_id`; Seed Vault confirmation (`subflows/seed-vault-confirm.yaml`) → none.
- Platform: with the Seed Vault simulator installed the dev build reports `seeker`; on a plain emulator image `android`.
- Powerups: install and remove Memo, send a memo on devnet, create a payment request.
- MWA: background Salmon, then `npx solana-mobile@latest playground` in the emulator's browser: connect, sign message, sign transaction, decline one (`flows/actions/seed-vault/mwa-sign.yaml` covers the signing path). Expect three dApp events, no `app_opened` between them, nothing for the decline. Repeat with Salmon killed first.
- First QR scan on a fresh install: count opens (risk: Android permission dialog).

## 5. iOS Simulator

Same flows minus MWA and Seed Vault. Face ID unlock (Features → Face ID → Matching Face) adds no `app_opened`; Home → reopen adds one; `platform` is `ios`. iOS Simulator reaches the local backend through the Mac's LAN address in `.env.local`.

## 6. Seeker device

Dev build over USB with `adb reverse`, opt in: the first batch carries `seeker`. `payment_request_paid`: pay an open request from a second wallet on devnet (needs devnet USDC) while the request is open, or run it in §7.

## 7. Staging

- Probe: the §2 body against `https://vdlgzf8qjd.execute-api.us-east-1.amazonaws.com/staging/v1/events` → `rejected: 0` for each platform. Staging keeps no lasting record (`/tmp` file sink), so the answer is the evidence.
- A real client: the unpacked extension (routing sends it to staging) with `SALMON_ANALYTICS_LIVE=1` and no override; the spec records each ingest response and expects `rejected: 0`.

## 8. Production (after release)

- GA4 property 307622850, wallet stream G-NZ4BZZ1R51, Realtime: `app_opened`, a Powerup event with `powerup` filled, platforms `ios`, `android`, `extension` within 48 h (SC-004). The read-only GA4 MCP's realtime report can list `eventName` × `customEvent:platform`.
- The one verification install withdraws consent afterwards.
- No simulator, dev client, internal build or e2e event appears in production during the verification period (SC-003).
