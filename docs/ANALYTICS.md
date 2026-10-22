# Pseudonymous analytics — tracking plan and metrics dictionary

This document is the reference for **what the wallet measures, with what data, and how every reported figure is computed from it**. It is a _ground-truth_ document: each event below is emitted by the code at the location given, each metric (M1–M11) has exactly one written definition and one way to compute it, and what **cannot** be measured is said explicitly. Two people following it for the same month get the same numbers.

## Privacy posture

Analytics are **pseudonymous and opt-in**. A random `installId` singles out one install across its events (that is what makes funnels and monthly counts work), so the data is pseudonymous rather than anonymous in the GDPR sense, and consent is required. An install starts without consent and the client sends nothing until it is granted, at the last onboarding step or with the "Usage Data" toggle in Settings. An event recorded before the stored consent has been read waits in memory for it, then is queued (consent given) or dropped (no consent); nothing is stored or sent before that answer.

Payload safety is guaranteed by an **allow-list, not a deny-list**:

- Only the 20 catalog events may be emitted.
- An event may only carry the 5 prop keys below, each with a closed list of values (or a boolean for `success`).
- A guardrail rejects any value that looks like an address or mint (base58 of 32–44 characters, `0x` + 40 hex), any number, and any string over 32 characters.
- **Never** does an address, an amount, a balance, a mint, anything derived from the seed, or anything that identifies a dApp (name, origin, domain, icon) travel.

Validation runs **twice, independently**: in the app before sending, and again in the backend at ingest (defense in depth — a tampered or outdated client cannot sneak data through).

**No IP reaches Google.** The ingest handler never reads the client IP, and Google Analytics 4 attributes an event to whoever calls it — the backend — so Google only sees the server's IP. No Google or Firebase SDK runs in the app; no device talks to Google directly. The only persistent identifier involved is `installId`, sent to GA4 as `client_id`.

Withdrawing consent **clears the queue, the install id and the consent version**, in every open window of the extension, not only the one where it was withdrawn. Granting it again creates a new install id.

### Consent version

The wallet stores which consent text an install accepted, because the 11 events added in v2 (including how often the app is opened) are only described by the v2 text.

| Stored consent                        | What the install sends                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| None, or `false`                      | Nothing                                                                                                                                                                                    |
| `true`, version `v2`                  | All 20 events                                                                                                                                                                              |
| `true` with no version (read as `v1`) | Only the 9 v1 events: `wallet_created`, `wallet_recovered`, `first_send_completed`, `send_completed`, `nft_viewed`, `nft_sent`, `network_switched`, `wallet_switched`, `address_book_used` |

Granting consent stores `v2`: both consent surfaces show the v2 text (`settings.analytics_prompt_body` on the onboarding screen, `settings.analytics_description` on the Settings toggle), which says that how often the app is opened is measured. The app does not yet show the v2 text to `v1` installs; a `v1` install moves to `v2` only when its user turns Usage Data off and on again. How `v1` installs are asked is decided after a legal answer (spec 042, LS-006).

## Where each thing lives

| Piece                                    | Location                                                             |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Catalog, prop keys and values (truth)    | `packages/shared/src/analytics/events.ts`                            |
| Payload guardrail                        | `packages/shared/src/analytics/schema.ts`                            |
| Client (consent, version, batching)      | `packages/shared/src/analytics/client.ts`                            |
| HTTP transport                           | `packages/shared/src/analytics/transport.ts`                         |
| Build routing (`getAnalyticsUrl`)        | `packages/shared/src/api/config.ts`                                  |
| "First-time" events                      | `packages/shared/src/analytics/first-time.ts`                        |
| Onboarding deferral                      | `packages/shared/src/analytics/deferred.ts`                          |
| Consent hook                             | `packages/shared/src/hooks/useAnalyticsConsent.ts`                   |
| Mobile start-up, platform, open rule     | `apps/mobile/src/analytics/appAnalytics.ts`                          |
| Extension start-up, store check, flushes | `apps/extension/src/analytics.ts`                                    |
| Backend mirror                           | `salmon-wallet-backend/src/analytics/event-schema.js`                |
| Backend ingest and platform list         | `salmon-wallet-backend/src/analytics/handler.js` (`POST /v1/events`) |
| Backend sink (file or GA4)               | `salmon-wallet-backend/src/analytics/sink.js`                        |

> The wallet catalog and the backend mirror **must be kept in sync**. A change in one forces the other, and the backend ships first: it must accept a new event, prop or platform on staging and production before any build that sends it is distributed, internal builds included. An event the backend does not accept is dropped at ingest (a batch holding only such events is refused, and the client drops it), so it never reaches GA4.

## Batch context

Not sent by each event: every request carries one context, and the backend adds the rest.

| Field         | Set by         | What it is                                                                                                                                                        |
| ------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `installId`   | Client         | Random UUID per install, created when consent is granted and deleted when it is withdrawn. **Not** derived from the wallet or the seed. GA4's `client_id`.        |
| `sessionId`   | Client         | Random, held in memory only. Extension: one per window. Mobile: one per app open (see below). GA4's `session_id` param.                                           |
| `platform`    | Client         | See "Platform values".                                                                                                                                            |
| `appVersion`  | Client         | Mobile: `expo.version` from `apps/mobile/app.json`. Extension: its `package.json` version. The backend records a value that is not semver as empty.               |
| `ts`          | Client (event) | Epoch ms when the event was recorded; for a transaction event, the start of its UTC day (see "Event time"). Kept in the backend record; **not** forwarded to GA4. |
| `received_at` | Backend        | Epoch ms of ingest; for a transaction event, the start of the UTC day it arrived.                                                                                 |
| `dt`          | Backend        | `YYYY-MM-DD` (UTC) of ingest — the partition key of the file sink.                                                                                                |

**Sessions.** On the extension each window runs its own client, so a session is one window from opening to closing. On mobile a new session starts at each app open: the cold open uses the session the process started with, and every later open first sends what is queued under the old session id, then switches to a new one. A Mobile Wallet Adapter sheet does not start a session.

**Event time.** The events that follow an on-chain transaction (`first_send_completed`, `send_completed`, `nft_sent`) carry only the UTC day they happened on, never the millisecond: an exact time lines up with the transaction on the public chain and would tie the install to the wallet that sent it. A day rather than an hour, because over several transactions the hours a wallet was active single it out far sooner than the days. The client stamps `ts` with the start of that UTC day (`TRANSACTION_EVENTS` in `packages/shared/src/analytics/events.ts`); the backend does the same to `received_at` and to the time it gives GA4 (`TRANSACTION_EVENTS` in `salmon-wallet-backend/src/analytics/event-schema.js`).

### Platform values

| Value       | Who sends it                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ios`       | The iOS app                                                                                                                       |
| `android`   | The Android app on a phone without a secure Seed Vault                                                                            |
| `seeker`    | The Android app on a phone with a secure Seed Vault — the same check that offers the SKR Powerup (a Solana Saga passes it too)    |
| `extension` | The Chrome and Firefox extension                                                                                                  |
| `mobile`    | iOS and Android builds older than analytics v2; the backend keeps accepting it so those installs keep reporting until they update |

The backend stores any other value as `unknown`. No batch leaves before the platform is known: on Android the client waits for the Seed Vault check, which is asked once per process; a check that has not answered within 2 seconds reports `android`.

## Allowed props

Only these five keys. Anything else is rejected, on both sides.

| Prop                              | Values                                                          |
| --------------------------------- | --------------------------------------------------------------- |
| `chain`, `from_chain`, `to_chain` | `solana`, `bitcoin`, `ethereum`                                 |
| `success`                         | `true`, `false` (a boolean; a string is rejected on both sides) |
| `powerup`                         | `swap`, `payments`, `memo`, `skr`                               |

No prop carries an amount, because the consent copy promises none. `powerup` holds the Powerups registry's ids; a Powerup added later adds its id to both allow-lists before it ships. `chain` is the network family (`solana-devnet` reports `solana`), never a network id.

> **In GA4, `success` reads `1` (true) and `0` (false)**, not `true`/`false`: the Measurement Protocol turns booleans into numbers. Every filter below uses `1` and `0`.

## Tracking plan: the 20 events

"All" means iOS, Android, Seeker and extension.

| Event                     | Fires when                                                                                                                                                                                                  | Props                                               | Platforms                  | Question it answers                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------- | ------------------------------------------------------------------- |
| `app_opened`              | An app open (see "App opens"), once per open                                                                                                                                                                | —                                                   | All                        | How many installs use Salmon each month, and how often they open it |
| `wallet_created`          | A wallet with a new recovery phrase is saved at onboarding, or an account derived from the active phrase is added in the wallet list                                                                        | —                                                   | All                        | How many wallets are created                                        |
| `wallet_recovered`        | An existing wallet is added: recovery phrase or private-key import, any Seed Vault flow (including creating a new seed inside Seed Vault), or a watch-only address                                          | —                                                   | All                        | How many people bring a wallet they already had                     |
| `first_send_completed`    | The install's first successful send, once per install                                                                                                                                                       | —                                                   | All                        | Send activation                                                     |
| `send_completed`          | A send ends: `success: true` once the network confirms it, `success: false` when the attempt fails                                                                                                          | `chain`, `success`                                  | All                        | Send volume, chain mix, send failure rate                           |
| `nft_viewed`              | An NFT's detail view opens                                                                                                                                                                                  | `chain`                                             | All                        | NFT engagement                                                      |
| `nft_sent`                | An NFT transfer ends, with its outcome (`success: true` or `false`)                                                                                                                                         | `chain`, `success`                                  | All                        | NFT sends and their failure rate                                    |
| `network_switched`        | The active network changes; `chain` is the destination family                                                                                                                                               | `chain`                                             | All                        | Multi-chain use                                                     |
| `wallet_switched`         | The active wallet changes                                                                                                                                                                                   | —                                                   | All                        | Multi-wallet use                                                    |
| `address_book_used`       | A contact is saved to the address book                                                                                                                                                                      | —                                                   | All                        | Address book adoption                                               |
| `powerup_installed`       | The user installs a Powerup that was not installed                                                                                                                                                          | `powerup`                                           | All                        | Which Powerups get adopted                                          |
| `powerup_uninstalled`     | The user removes an installed Powerup, from the catalogue or from the Home tab sheet                                                                                                                        | `powerup`                                           | All                        | Which Powerups get dropped                                          |
| `swap_completed`          | A swap attempt ends: `success: true` once the network confirms it, `success: false` when signing or sending fails. Backing out of the confirmation is not an attempt                                        | `from_chain: solana`, `to_chain: solana`, `success` | All where Swap is offered  | Swap volume and failure rate                                        |
| `first_swap_completed`    | The install's first successful swap, once per install                                                                                                                                                       | —                                                   | All where Swap is offered  | Swap activation                                                     |
| `memo_sent`               | A memo attempt ends: `success: true` once the network confirms it, `success: false` when signing or sending fails                                                                                           | `success`                                           | All                        | Memo Powerup use                                                    |
| `payment_request_created` | The user creates a payment request in the Payments Powerup and its code is shown                                                                                                                            | —                                                   | All                        | Payments Powerup use (the receiver's side)                          |
| `payment_request_paid`    | The wallet first finds that one of its payment requests was paid, once per request                                                                                                                          | —                                                   | All                        | Whether payment requests turn into payments                         |
| `dapp_connected`          | The user approves a dApp's connection and the wallet grants it: the extension's connect approval window; Mobile Wallet Adapter's authorize sheet, including its sign-in variant                             | —                                                   | Extension, Android, Seeker | How many installs use Salmon with dApps                             |
| `dapp_message_signed`     | The user approves a message signature and the wallet returns it: the extension's message and off-chain message requests and its standalone Sign-In With Solana; Mobile Wallet Adapter's sign-messages sheet | —                                                   | Extension, Android, Seeker | dApp logins and message use                                         |
| `dapp_transaction_signed` | The user approves a transaction request and the wallet returns the result: sign, sign all, or sign and send. One event per approval, however many transactions it holds                                     | —                                                   | Extension, Android, Seeker | On-chain activity that flows through dApps                          |

Powerup events fire only in builds with Powerups compiled in. Swap is offered where the backend's switch and the network allow it.

### Where each event is emitted

Shared hooks and Powerups run on both apps, so one call covers mobile and extension.

| Event                     | Emitted at                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app_opened`              | Mobile cold open `apps/mobile/src/analytics/appAnalytics.ts:69` (called from `apps/mobile/app/_layout.tsx:173`); mobile return open `appAnalytics.ts:61`; extension `apps/extension/src/analytics.ts:35`                                                                                                   |
| `wallet_created`          | Onboarding: `apps/mobile/app/(auth)/password.tsx:330` and `packages/ui/src/components/AuthFlow/PasswordPage.tsx:222` through `trackOnboardingEvent` (`packages/shared/src/analytics/deferred.ts:38`, or `:56` once consent is answered); wallet list: `packages/shared/src/hooks/useAccountAddFlow.ts:475` |
| `wallet_recovered`        | Same three sites as `wallet_created`                                                                                                                                                                                                                                                                       |
| `first_send_completed`    | `packages/shared/src/hooks/useSendTransaction.ts:263` through `trackFirstTime` (`packages/shared/src/analytics/first-time.ts:39`)                                                                                                                                                                          |
| `send_completed`          | `packages/shared/src/hooks/useSendTransaction.ts:258` (success), `:303` (failure)                                                                                                                                                                                                                          |
| `nft_viewed`              | Mobile `apps/mobile/app/(app)/nft/[id]/index.tsx:72`; extension `packages/ui/src/components/NftDetailPage/NftDetailPage.tsx:87`                                                                                                                                                                            |
| `nft_sent`                | `packages/shared/src/hooks/useNftTransfer.ts:131` (success), `:161` (failure)                                                                                                                                                                                                                              |
| `network_switched`        | `packages/shared/src/hooks/useAccountsSelection.ts:172`                                                                                                                                                                                                                                                    |
| `wallet_switched`         | `packages/shared/src/hooks/useAccountsSelection.ts:121`                                                                                                                                                                                                                                                    |
| `address_book_used`       | `packages/shared/src/hooks/useAddressbook.ts:183`                                                                                                                                                                                                                                                          |
| `powerup_installed`       | `packages/shared/src/hooks/useInstalledPowerups.ts:107`                                                                                                                                                                                                                                                    |
| `powerup_uninstalled`     | `packages/shared/src/hooks/useInstalledPowerups.ts:116`                                                                                                                                                                                                                                                    |
| `swap_completed`          | `packages/shared/src/powerups/swap/useSwapScreenLogic.ts:267` (the proposal's `onOutcome`, set at `:376`, called by `packages/shared/src/core/confirmation/SignatureRequestContext.tsx:166` on success and `:208` on failure)                                                                              |
| `first_swap_completed`    | `packages/shared/src/powerups/swap/useSwapScreenLogic.ts:268` through `trackFirstSwapCompleted` (`packages/shared/src/analytics/first-time.ts:51`)                                                                                                                                                         |
| `memo_sent`               | `packages/shared/src/powerups/memo/useMemoScreenLogic.ts:47` (the proposal's `onOutcome`, called as for `swap_completed`)                                                                                                                                                                                  |
| `payment_request_created` | `packages/shared/src/powerups/payments/usePaymentsScreenLogic.ts:331`                                                                                                                                                                                                                                      |
| `payment_request_paid`    | `packages/shared/src/powerups/payments/usePaymentsScreenLogic.ts:378`                                                                                                                                                                                                                                      |
| `dapp_connected`          | Extension `apps/extension/src/pages/dapp/DAppConnectPage.tsx:39` (through `trackDAppApproval`, `useDAppApproval.ts:20`); mobile `apps/mobile/src/mwa/MwaRequest.tsx:323`                                                                                                                                   |
| `dapp_message_signed`     | Extension `apps/extension/src/pages/dapp/useDAppApproval.ts:84`, named by `DAppSignMessageApprovalPage.tsx:84` and `DAppSignInApprovalPage.tsx:67`; mobile `apps/mobile/src/mwa/MwaRequest.tsx:382`                                                                                                        |
| `dapp_transaction_signed` | Extension `apps/extension/src/pages/dapp/useDAppApproval.ts:84`, named by `DAppTransactionApprovalPage.tsx:103`; mobile `apps/mobile/src/mwa/MwaRequest.tsx:476` (sign) and `:492` (sign and send)                                                                                                         |

### Rules behind the events

- **App opens (mobile).** An open is the app starting (the first mount of the root navigator, after an update applied at launch) or the app coming back to the screen after it went to the background — the same moment the wallet locks. `apps/mobile/app/_layout.tsx` notes the leave exactly where it locks, so an open and a lock always agree. Returning from a Seed Vault screen, an Android permission dialog or an iOS system overlay (Face ID, Control Center, notifications) is not an open, and neither is a dApp's Mobile Wallet Adapter sheet. A process that Mobile Wallet Adapter starts never mounts the navigator, so it records no open; its dApp events still arrive.
- **App opens (extension).** Opening the side panel (Chrome) or sidebar (Firefox), which is what the toolbar button does; the extension declares no toolbar popup. A window the extension opens to approve a dApp request carries the request in its URL hash and records no open.
- **Onboarding events are deferred until the consent answer.** `wallet_created` / `wallet_recovered` fire during onboarding, before the consent screen (the last onboarding step). While that prompt is unanswered, the event name is parked in device storage and never leaves the device; accepting sends it, declining deletes it. A wallet added after the prompt was answered is tracked directly.
- **"First-time" events** (`first_send_completed`, `first_swap_completed`) fire once per install, guarded by a stored flag (`salmon_analytics_first_send`, `salmon_analytics_first_swap`). The flag is set only when the event is actually sent (consent given and covering it), so a first send made before opting in is counted on the first send after opting in. The flags are not cleared by a consent withdrawal. Installs that reported `first_swap_completed` from an August–September 2026 build hold the same flag and do not report it again.
- **Outcome events** (`swap_completed`, `memo_sent`) are reported by the confirmation screen through the proposal's `onOutcome`: `true` once signing resolved (the network confirmed the transaction), `false` once per failed attempt. Backing out reports nothing, and a failure inside the Powerup's reporting never turns a signed transaction into a failure. An attempt whose outcome the network could not confirm either way (it may have landed) reports nothing; so does a send or an NFT send in that state.
- **`payment_request_paid`** fires once per request: the stored `paid` status and a per-screen set of reported ids keep two simultaneous checks from reporting it twice.
- **dApp events** count completed approvals only: a denial, a request the dApp abandons, a closed sheet, a guard error or a signing failure records nothing. They carry no prop at all. On the extension the event is tracked and sent before the answer reaches the background, because the background closes the approval window as soon as it gets the answer. A site the user approved before reconnects silently and records nothing.

### Untracked on purpose

- The consent answer itself: a decline sends nothing, by design.
- Settings preferences (language, currency, theme, explorer, developer networks, unverified tokens), renaming a wallet, profile pictures, hiding balances, editing or removing contacts, password and biometric changes, revealing the recovery phrase or a private key, removing wallets, and revoking a trusted dApp: none of them answers a reported metric.
- Receiving (opening the Receive sheet, copying the address): a weak signal of use.
- Burning an NFT, viewing activity, token detail and staked SOL.
- A Solana Pay payment made from the payer's side is a send: it counts as `send_completed`, with nothing linking it to the request.
- The SKR Powerup's screen: SKR builds no transaction and has no action to complete; its adoption is its installs.
- Silent dApp events with no user decision: an already-approved site reconnecting, Mobile Wallet Adapter re-authorizations and deauthorizations, and a dApp disconnecting itself.

## Delivery

### Batching

Events wait in memory and leave in batches. A send starts:

- every 30 seconds while consent is given;
- when 20 events are queued;
- on the extension, when its window is hidden or closed (`pagehide`, `visibilitychange` to hidden), and right after a dApp approval is tracked;
- on mobile, when the app goes to the background, and before a new session starts at an app open.

A send is split into requests of at most 100 events, the backend's per-request cap. No request leaves before the client knows the stored consent, the platform and the build kind. The queue holds at most 200 events (the oldest are dropped past that) and is **not** persisted. A request lost to the network or a timeout, or answered with a 5xx, 408 or 429, puts its events back for the next send, unless consent was withdrawn meanwhile or the install id changed. A request the backend refused with any other 4xx is dropped.

The transport posts `{base}/v1/events` with `fetch` and `keepalive: true` (a request started as a window closes still arrives), a `text/plain` JSON body and no other header (no CORS preflight), and gives up after 10 seconds.

### Routing by build

Only store builds reach production analytics, so simulators, development builds and e2e runs never pad the reported figures. A team device running the store binary (the Play internal track, a production build in TestFlight, the production APK) is a store build and does report to production. The routing adds no field to any event or batch.

| Build                                                                                                     | Store build?                             | `{base}`                                                                            |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| App Store / Google Play (`production`), sideload APK (`production-apk`), Solana dApp Store (`dapp-store`) | Yes (EAS channel `production`)           | Production API                                                                      |
| Chrome Web Store, Firefox Add-ons install                                                                 | Yes (`installType` is not `development`) | Production API                                                                      |
| `dapp-store-test`, `staging`, `testflight`                                                                | No                                       | Staging API                                                                         |
| Dev client, simulator, `local` profile, Release build made without EAS, Maestro run                       | No                                       | The local backend in local mode; staging when the build talks to the production API |
| Unpacked extension (development, Playwright)                                                              | No                                       | Same rule as the line above                                                         |
| Any build with `EXPO_PUBLIC_ANALYTICS_URL` / `VITE_ANALYTICS_URL` set                                     | —                                        | That URL                                                                            |

Mobile reads `Updates.channel` (`expo-updates`); EAS writes `production` into the `production`, `production-apk` and `dapp-store` builds. The extension asks the browser at runtime (`browser.management.getSelf()`, no permission needed), because its store package and its e2e build are the same bytes; a check that fails counts as not a store copy. `getAnalyticsUrl(storeBuild)` in `packages/shared/src/api/config.ts` applies the rule.

### Ingest and Google Analytics

A batch is POSTed to an **isolated ingest Lambda** (`salmon-wallet-backend/src/analytics/handler.js`), separate from the wallet API so a traffic spike cannot compete with it. It re-validates every event against the allow-list and answers `202 {"accepted": n, "rejected": m}`; a batch with no valid event gets `400`. The client drops a batch the backend refused with a 4xx other than 408 or 429, since sending it again cannot help, and re-queues one lost to the network, a timeout, a 5xx, 408 or 429. Production forwards accepted events to **GA4** through the Measurement Protocol, in requests of 25, with `client_id = installId`, `timestamp_micros` set to the start of the hour the batch arrived (the start of its UTC day for transaction events, which travel in a request of their own), and these params on every event: `session_id`, `platform`, `app_version`, `engagement_time_msec: 1` (so GA4 counts the event as engaged), plus the event's props. Staging writes to a file in the Lambda's temporary storage and forwards nothing to GA4; the local backend writes NDJSON.

Delivery is best-effort: the Measurement Protocol answers `2xx` for any well-formed request without validating event contents, so a data point can be lost server-side without an error. See `salmon-wallet-backend/docs/ANALYTICS.md` for the sink and its environment variables.

### Google Analytics setup

| Item                 | Value                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Property             | `307622850` ("salmon-wallet"); reporting time zone `America/Buenos_Aires`                                                                                    |
| Wallet stream        | `G-NZ4BZZ1R51` — in the Data API `streamId` `3353576817`, `streamName` `salmon-wallet`                                                                       |
| Website stream       | `G-8W36W1WMX8` (www.salmonwallet.io) — `streamId` `16053506340`, `streamName` `Salmon website`. Same property: **every report filters to the wallet stream** |
| Custom dimensions    | Event-scoped, Data API name `customEvent:<param>`: `platform`, `app_version`, `chain`, `from_chain`, `to_chain`, `success`, `powerup`                        |
| Key events           | `wallet_created`, `wallet_recovered`, `first_send_completed`, `first_swap_completed`                                                                         |
| Event data retention | 2 months                                                                                                                                                     |

A param that is not registered as a custom dimension is delivered but does not surface in reports. Retention of 2 months means event-level data (explorations, segments, cohorts) older than two months is gone: any figure that follows individual installs across months (M6, the M5 rate) is computed and recorded in the first days after its month closes. Retention stays at 2 months because 14 months would change the Privacy Policy (§6.1, §9) and the store privacy declarations.

## Metrics dictionary

### Conventions for every metric

- **Population**: installs that accepted analytics, on store builds. Every figure is a lower bound of real use: installs that declined are invisible, and so is how many declined.
- **Consent version**: installs that consented under the v1 text send only the 9 v1 events. A metric built on an event added in v2 (M2, the swap half of M5, M7–M10) counts only `v2` installs, while M1 counts both.
- **Unit**: an install, which GA4 calls a user. Use **Total users** (`totalUsers`: distinct installs that sent a matching event), never a figure that depends on Google's automatic events, which the wallet does not send.
- **Stream**: filter every report to the wallet stream (`streamId` = `3353576817`); the website shares the property.
- **Catalog filter**: the wallet stream also holds a few automatic web events (`page_view`, `session_start`, `first_visit`, `scroll`, with no `platform`). Metrics that count "any event" (M1, M3, M6) filter `eventName` to the 20 catalog events.
- **Month**: the calendar month in the property's time zone (`America/Buenos_Aires`). An event counts on the day its batch reached the backend, which can be later than the day it happened when a device was offline. A transaction event is dated 00:00 UTC of that day, which Buenos Aires time shows as 21:00 the day before: one made on the 1st of a month before 21:00 Buenos Aires time counts in the previous month.
- **History**: mobile builds older than v2 report `platform = mobile`. For a cross-period figure, mobile is `mobile` + `ios` + `android` + `seeker`; while old builds remain in use, the four coexist. An install that updates during a month reports under two values, so per-platform rows can add up to more than M1.

### How to compute a metric

Every figure below is one GA4 Data API `runReport` call (`POST https://analyticsdata.googleapis.com/v1beta/properties/307622850:runReport`), or the same query in the GA4 interface. The date range is exactly one calendar month and the query has **no date dimension** (Total users per day cannot be added up into a month). All string filters are exact matches. Example — M8, swaps completed and swapping installs in November 2026:

```json
{
  "dateRanges": [{ "startDate": "2026-11-01", "endDate": "2026-11-30" }],
  "metrics": [{ "name": "eventCount" }, { "name": "totalUsers" }],
  "dimensionFilter": {
    "andGroup": {
      "expressions": [
        { "filter": { "fieldName": "streamId", "stringFilter": { "value": "3353576817" } } },
        { "filter": { "fieldName": "eventName", "stringFilter": { "value": "swap_completed" } } },
        { "filter": { "fieldName": "customEvent:success", "stringFilter": { "value": "1" } } }
      ]
    }
  }
}
```

Below, "stream" means the `streamId` filter above, "catalog" means `eventName` in the 20 catalog event names (`inListFilter`), and `success = 1` means `customEvent:success` exactly `1`.

### M1. Monthly active wallets

- **Definition**: distinct installs that sent at least one event in the month.
- **Compute**: `totalUsers`, filters stream + catalog. Split: add the dimension `customEvent:platform`.
- **Note**: "wallet" means an install, not an on-chain address. An install that only approves dApp requests is active.

### M2. App opens

- **Definition**: count of `app_opened` in the month, and opens per active wallet = that count ÷ M1.
- **Compute**: `eventCount`, filters stream + `eventName` = `app_opened`.
- **Note**: the open in which the user accepts analytics is not counted (consent comes at the end of onboarding). A side panel left open all day is one open. `v1` installs send no `app_opened` but count in M1, so while they exist the ratio understates opens; the like-for-like ratio divides by `totalUsers` with `eventName` = `app_opened` (installs that reported an open), and the report says which one it shows.

### M3. Platform mix

- **Definition**: M1 split by `platform`, as counts and shares (each count ÷ M1).
- **Compute**: M1's query with the dimension `customEvent:platform`.
- **Note**: Seeker is a subset of Android phones; `android` excludes it. Rows can add up to more than M1 (see "History").

### M4. New wallets

- **Definition**: count of `wallet_created` + `wallet_recovered` in the month, also shown apart.
- **Compute**: `eventCount`, filters stream + `eventName` in [`wallet_created`, `wallet_recovered`], dimension `eventName`.
- **Note**: this counts wallets added, not new installs: a second wallet added in an existing install counts, and so does a watch-only address. A new install whose user declined at onboarding and accepted later in Settings is not counted. The report labels the figure "wallets added".

### M5. Activation

- **Definition**: installs that reached their first send or their first swap in the month = count of `first_send_completed` + count of `first_swap_completed`, also shown apart (each event fires once per install).
- **Compute**: `eventCount`, filters stream + `eventName` in [`first_send_completed`, `first_swap_completed`], dimension `eventName`.
- **Activation rate (approximate)**: `totalUsers` with `eventName` in [`first_send_completed`, `first_swap_completed`] ÷ `totalUsers` with `eventName` in [`wallet_created`, `wallet_recovered`], same month, both with the stream filter.
- **Note**: the rate is approximate because the denominator also holds existing installs adding wallets, and the numerator includes installs whose wallet was added in an earlier month. The "first" flags survive a consent withdrawal, so an install that withdraws and opts in again never reports its first send again.

### M6. Month-1 retention

- **Definition**: of the installs active in month M, the share that is active again in month M+1.
- **Compute**: GA4 Explore → Cohort exploration. Date range: first day of M to last day of M+1. Cohort inclusion: **Any event** (not "First touch"). Return criteria: any event. Granularity: monthly. Filter: stream name `salmon-wallet`, event name in the catalog. Read cohort M's "Month 1" share in the first days after M+1 closes and record it with the month it describes.
- **Note**: a reinstall or a consent withdrawal makes a new install, which reads as churn plus a new install.

### M7. Powerup adoption

- **Definition, per Powerup**:
  - Installs in the month: count of `powerup_installed` with that `powerup`.
  - Removals in the month: count of `powerup_uninstalled` with that `powerup`.
  - Active users of the Powerup in the month: distinct installs with its core action event: Swap `swap_completed` with `success = 1`; Memo `memo_sent` with `success = 1`; Payments `payment_request_created`. SKR has no action event: its figure is installs only.
- **Compute**: installs and removals: `eventCount`, filters stream + `eventName` = `powerup_installed` (or `powerup_uninstalled`), dimension `customEvent:powerup`. Active users: `totalUsers` with the core action's filters.
- **Note**: how many installs have a Powerup installed right now is not measurable: installation is a state on the device and events record changes, not states.

### M8. Swap usage

- **Definition**: swaps completed = count of `swap_completed` with `success = 1`; swapping installs = distinct installs with that event; first swaps = count of `first_swap_completed`; swap failure rate = count with `success = 0` ÷ count of all `swap_completed`.
- **Compute**: the example query above gives the first two (`eventCount`, `totalUsers`); the failure rate uses `eventCount` with `eventName` = `swap_completed` and the dimension `customEvent:success`.
- **Note**: the failure rate is per attempt: a user who fails once and retries counts one failure and one success.

### M9. Payments usage

- **Definition**: requests created = count of `payment_request_created`; requests seen paid = count of `payment_request_paid`; paid share = requests seen paid ÷ requests created, over the same months.
- **Compute**: `eventCount`, filters stream + `eventName` in [`payment_request_created`, `payment_request_paid`], dimension `eventName`.
- **Note**: "seen paid" is a lower bound: the wallet only looks while the request is open or the list is on screen, so a request paid while its owner never reopens the Powerup is not counted, and one can be counted a month after it was created.

### M10. dApp usage

- **Definition**: connecting installs = distinct installs with `dapp_connected`; dApp transactions = count of `dapp_transaction_signed`, and transacting installs = distinct installs with it; dApp messages = count of `dapp_message_signed`. Split by `platform`: `extension` is the browser provider, `android` and `seeker` are Mobile Wallet Adapter (iOS has no Mobile Wallet Adapter).
- **Compute**: `totalUsers` (installs) or `eventCount` (counts), filters stream + `eventName` = the event, dimension `customEvent:platform`.
- **Note**: which dApps are used is not measurable, by design. A site the user approved before reconnects silently and is not counted again.

### M11. Send usage

- **Definition**: sends completed = count of `send_completed` with `success = 1`, split by `chain`; sending installs = distinct installs with it; send failure rate = count with `success = 0` ÷ count of all `send_completed`.
- **Compute**: `eventCount` and `totalUsers`, filters stream + `eventName` = `send_completed` + `success = 1`, dimension `customEvent:chain`; the failure rate as in M8.
- **Note**: transfers a dApp asks for are counted under M10, not here.

### Not measurable with this design

- Opt-in rate, and anything about installs that declined.
- People: one person can be several installs (the phone app and the extension are two).
- Money: balances, amounts, volume, fees.
- Which dApps, tokens or addresses are involved.
- Abandoned attempts: an action the user starts and leaves before submitting.
- How many installs hold a Powerup at a given moment.

## Known limitations (read before designing a metric)

### 1. Every figure is a lower bound

Only installs that opted in are counted, and the open in which the user opts in is not. Installs that consented under the v1 text send only the 9 v1 events until they turn Usage Data off and on again (see "Consent version").

### 2. Onboarding events count wallets added, not installs

The onboarding events are kept on the device until the consent answer and sent on acceptance, so a first-run user who accepts is counted. A user who declines at onboarding and opts in later in Settings is never counted for that wallet. Every wallet added afterwards in the wallet list counts too, so `wallet_created` + `wallet_recovered` is "wallets added", not "new installs".

### 3. Outcome rate yes, attempt funnel no

`send_completed`, `nft_sent`, `swap_completed` and `memo_sent` fire on both outcomes, so failure rates among submitted operations are computable. There is no _attempt_ event: a user who abandons before submitting is never counted.

### 4. No operation size

No event carries an amount or a size range: the consent copy promises none. Segmenting by operation size would need a new prop, a new consent text and a new consent version.

### 5. No identity, no value

There is no way to attribute to a real user, cohort by wallet, measure balances or volume, or tie events to an address. `installId` is lost when the app is reinstalled or consent is withdrawn; the "first" flags are not, so a re-consenting install never reports its first send or swap again.

### 6. Delivery is best-effort

The queue lives in memory. Events recorded before the app went to the background, or before an extension window hid or closed, are sent at that moment; events recorded after it, or while offline beyond 200 queued events, can be lost. Offline events count on the day they reach GA4. Server-side, the Measurement Protocol answers `2xx` without validating contents.

### 7. Platform edge cases

An Android phone whose Seed Vault check takes longer than 2 seconds reports `android` for that process, even on a Seeker. On mobile, a dApp approval is sent with the next batch (background, 20 events or 30 seconds) rather than at once. Two behaviours are not yet confirmed on real runtimes: that an approval made through Mobile Wallet Adapter while Salmon was not running is delivered, and that Firefox reports an add-on loaded through `about:debugging` as `development` (if it does not, that copy posts to production).

### 8. History in GA4

Rows from before analytics v2 carry `platform = mobile` (iOS and Android builds), `web` (the retired web app) or `unknown`. `swap_completed` and `first_swap_completed` also appear from August–September 2026 builds, with the same names and props, so they form one continuous series. On mobile, GA4's session counts mean "one app open" for v2 builds and "one process lifetime" for older builds.

### 9. Two months of event-level data

See "Google Analytics setup": cohort and segment figures are recorded monthly, before their month ages out.

## Verification

### Unit tests

The catalog, guardrail, client (consent version, batching, sessions, routing) and transport are covered by the Vitest suites next to each file in `packages/shared/src/analytics/` and `packages/shared/src/api/config.test.ts`; each call site has its own test (`useInstalledPowerups`, the Swap, Memo and Payments screen logic, `SignatureRequestContext`, the extension dApp pages, `apps/mobile/src/mwa/MwaRequest.analytics.test.tsx`, `apps/mobile/src/analytics/appAnalytics.test.ts`, `apps/extension/src/analytics.test.ts`).

### Local backend

The backend's `docker-compose.yml` serves the wallet API **and** the analytics ingest on the same port (`OFFLINE_HTTP_PORT` in its `.env`, 3000 when unset; the commands below use 3001, the port the Playwright suite expects). With `ANALYTICS_SINK=file` (the compose default) accepted events are appended to `.analytics-local/events.ndjson`.

```bash
# in ../salmon-wallet-backend
docker compose up -d                 # redis + backend (serverless-offline)
: > .analytics-local/events.ndjson   # start each run empty
# after a run: platform, event and props, counted
jq -r '[.platform, .event, (.props|tostring)] | @tsv' .analytics-local/events.ndjson | sort | uniq -c
```

The ingest answers `POST /local/v1/events`. Probe the allow-list with the 11 v2 events before building anything:

```bash
curl -s -X POST -H 'Content-Type: text/plain' http://127.0.0.1:3001/local/v1/events --data '{
  "context":{"installId":"probe","sessionId":"probe","platform":"seeker","appVersion":"1.5.0"},
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
    {"event":"dapp_transaction_signed","props":{},"ts":1}]}'
# expect {"accepted":11,"rejected":0}; repeat with platform ios, android, extension, mobile
```

### Pointing an app at it

The transport posts to `{base}/v1/events`, where `{base}` follows the routing rule. Two ways to reach the local backend:

- **Local mode** (the wallet and its events both local): in `apps/mobile/.env.local` (from `.env.local.example`) set `EXPO_PUBLIC_SALMON_ENV=local`, `EXPO_PUBLIC_API_PORT` and, where the default host does not reach the Mac, `EXPO_PUBLIC_API_HOST`: the iOS Simulator uses the Mac's LAN address; the Android emulator defaults to `10.0.2.2` (the host); a device over USB uses `127.0.0.1` with `adb reverse tcp:3001 tcp:3001`.
- **Events only** (the wallet on its normal backend, events local): set `EXPO_PUBLIC_ANALYTICS_URL=http://<host>:3001/local` (`VITE_ANALYTICS_URL` on the extension). The `/local` prefix is part of every serverless-offline route.

For the extension, put `VITE_ANALYTICS_URL=http://127.0.0.1:3001/local` in the gitignored `apps/extension/.env.production.local`, then `pnpm --filter @salmon/extension build`. Delete the file and rebuild before any other use: without it the unpacked build posts to staging.

### Extension (Playwright)

The suite loads the unpacked `dist/chrome-mv3` build and opens `popup.html` directly, without an approval hash, so each spec records `app_opened`. The specs stub `/v1/events`; with `SALMON_ANALYTICS_LIVE=1` the `analytics` and coverage specs let the requests through to the backend the build posts to and assert the ingest accepted them.

| Spec                                 | What it asserts                                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `analytics.spec.ts`                  | With consent off a tracked action sends nothing; with consent on, `network_switched` arrives with categorical props only, no address or mint, and `platform: extension` |
| `analytics-consent-prompt.spec.ts`   | The consent screen is the last onboarding step, offers both choices, and accepting turns the Settings toggle on                                                         |
| `analytics-coverage.spec.ts`         | `address_book_used`, `wallet_created`, `wallet_recovered`, `wallet_switched`, `network_switched`, `nft_viewed` all arrive                                               |
| `analytics-coverage-onchain.spec.ts` | `send_completed`, `first_send_completed`, `nft_sent` arrive after real devnet transfers; opt-in with `SALMON_E2E_ONCHAIN=1`                                             |

```bash
SALMON_ANALYTICS_LIVE=1 SALMON_API_URL=http://127.0.0.1:3001/local \
  pnpm --filter @salmon/extension e2e analytics-coverage
```

The 11 v2 events are covered by the unit tests above; the Playwright specs do not assert them yet.

### Mobile (Maestro)

Flows live in `apps/mobile/.maestro/` and run through `./run.sh` from that folder. Consent is _declined_ by default in `subflows/onboard-walletA.yaml`; for a flow to emit events, opt in first with `subflows/enable-analytics.yaml` (the Settings toggle). `flows/smoke/settings/analytics.yaml` and `flows/smoke/settings/analytics-prompt.yaml` cover the toggle and the consent screen.

> **Watch out for the flush**: run one flow at a time and wait ~35 s before the next. The next flow's `clearState` ends the app, and events recorded after its last send are lost with the in-memory queue.

On Android the platform is `seeker` when the Seed Vault simulator is installed (development builds accept it) and `android` otherwise; Mobile Wallet Adapter is exercised from a dApp in the emulator's browser with Salmon in the background.

### Staging and production

- **Staging** (`https://vdlgzf8qjd.execute-api.us-east-1.amazonaws.com/staging/v1/events`): send the probe body above once per platform and expect `"rejected":0`. Staging keeps no lasting record, so its answer is the evidence. An unpacked extension with analytics on posts here.
- **Production**: a GA4 standard report on property `307622850`, wallet stream, `eventName` × `customEvent:platform`. Realtime shows only the last 30 minutes, so it misses events dated to the start of their hour or, for transaction events, of their day. Only store builds appear there; a team install used to check it withdraws consent right after, which deletes its install id.
