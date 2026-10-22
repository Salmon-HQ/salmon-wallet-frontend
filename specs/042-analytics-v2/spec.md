# Feature Specification: Analytics catalog v2

**Feature Branch**: `feat/042-analytics-v2` (spec dir `042-analytics-v2`)

**Created**: 2026-10-19

**Status**: Draft

**Input**: Owner: extend the wallet's opt-in, pseudonymous usage analytics so Salmon can report trustworthy product metrics to backers (the Backable / MetaDAO raise) and improve the product. Deliverables: a tracking plan (event, trigger, props, the question it answers) and a metrics dictionary (the exact definition of each reported metric).

## Owner decisions (2026-10-19)

1. Powerups: one specific event per Powerup's core action, never a generic "powerup used"; plus `powerup_installed` / `powerup_uninstalled`, which carry a new closed-list prop `powerup`. Its values are the ids in the Powerups registry: `swap`, `payments`, `memo`, `skr`.
2. Team and tester noise: every non-store build (simulators, dev clients, preview and internal builds, local and e2e runs) sends analytics to the staging backend, never to production Google Analytics. No new data field is added. Team members decline analytics on their personal store installs (a team process, not code).
3. dApp usage: connections and signature approvals are measured for the extension's provider (Wallet Standard and the injected provider) and for Mobile Wallet Adapter, without any dApp identity: no name, origin, domain or icon. This keeps Apple's "Browsing History" and Play's "Web browsing history" out of scope.
4. Consent copy: the in-app consent text (English and Spanish) changes in this same version to also say that how often the app is opened is measured. The exact strings are below; the owner confirmed them on 2026-10-19.

## Defaults set by the supervising session

- All 9 current events keep their names and meaning (the catalog is append-only: renaming breaks history in Google Analytics).
- `app_opened` is added. "Session" is defined below; the default "once per session" holds only with the session rule in FR-004, because on mobile one session today lasts until the operating system ends the app, across every return to the screen.
- The Swap Powerup reuses the historical names `swap_completed` and `first_swap_completed` (emitted by August–September 2026 builds), with the props they carried then, so Google Analytics shows one continuous series.
- Payments, Memo and SKR get an event for their core action where one exists. SKR is read-only: it has no action to complete, so it gets no action event; its adoption is its installs.
- The batch `platform` splits `mobile` into `ios`, `android` and `seeker`; `extension` stays.
- `success` is reused wherever an action has an outcome. dApp events count completed approvals only (FR-012).
- `amount_bucket` leaves both allow-lists: the consent copy promises no amounts, so no prop may carry one.

## How the analytics work today (the base this builds on)

- Nothing is collected until the user accepts the consent prompt at the end of onboarding or turns "Usage Data" on in Settings. Withdrawing consent deletes the queue and the random install identifier.
- Every event passes a closed allow-list twice: in the app and again at the backend's ingest. Anything that looks like an address, a token mint, a raw number or a long string is dropped.
- Events wait in memory and leave in batches every 30 seconds or every 20 events. Each batch carries the install identifier, a session identifier, the platform and the app version. The backend forwards accepted events to Google Analytics 4 (property 307622850, wallet stream G-NZ4BZZ1R51; the website stream G-8W36W1WMX8 lives in the same property).
- Known defect: an extension window that closes before the next 30-second send loses every event it recorded. The side panel is often open for less than that and the dApp approval windows almost always are, so the extension under-reports today's events, and v2's approval-window events would almost never arrive (FR-015 fixes it).
- Known defect: an event recorded in the first moments after a window or the app starts is dropped, because consent is read from storage asynchronously and the client treats "not read yet" as "no consent" (FR-016 fixes it for `app_opened`, the event that fires at that moment).

## Definitions

- **Install**: one copy of Salmon on one device or browser profile that accepted analytics, known by its random install identifier. Google Analytics calls it a "user". One person with the phone app and the extension is two installs; withdrawing and granting consent again makes a new install identifier.
- **Store build**: a build the public installs: the App Store and Google Play builds, the Solana dApp Store build, the sideload APK (`production-apk` profile, which real users install directly), and the Chrome Web Store and Firefox Add-ons packages. The dApp Store test APK (`dapp-store-test`) is not a store build.
- **App open**: on mobile, the app starting, or the app coming back to the screen after it went to the background — the same moment the wallet locks and asks to be unlocked. Returning from a Seed Vault screen, an Android permission dialog or an iOS system overlay (Face ID, Control Center, notifications) is not an open, and neither is a dApp's approval sheet through Mobile Wallet Adapter. On the extension, the side panel (Chrome) or sidebar (Firefox) opening, which is what the toolbar button does; the extension declares no toolbar popup. A window the extension opens to approve a dApp request is not an open.
- **Session**: on the extension, one window from opening to closing (each window already starts its own). On mobile, from one app open to the next (FR-004).
- **Seeker**: an Android phone with a secure Seed Vault, the same check that offers the SKR Powerup. The Solana Saga passes that check too and is reported as `seeker`.

## Tracking plan

The catalog after this feature: 20 events. "All" means iOS, Android, Seeker and extension.

| Event                                                   | Fires when                                                                                                                                                                                                  | Props                                               | Platforms                  | Question it answers                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------- | ------------------------------------------------------------------- |
| `app_opened` (new)                                      | An app open (see Definitions), once per open                                                                                                                                                                | —                                                   | All                        | How many installs use Salmon each month, and how often they open it |
| `wallet_created`                                        | A wallet with a new recovery phrase is saved at onboarding, or an account derived from the active phrase is added in the wallet list                                                                        | —                                                   | All                        | How many wallets are created                                        |
| `wallet_recovered`                                      | An existing wallet is added: recovery phrase or private-key import, any Seed Vault flow (including creating a new seed inside Seed Vault), or a watch-only address                                          | —                                                   | All                        | How many people bring a wallet they already had                     |
| `first_send_completed`                                  | The install's first successful send, once per install                                                                                                                                                       | —                                                   | All                        | Send activation                                                     |
| `send_completed`                                        | A send ends: `success: true` once the network confirms it, `success: false` when the attempt fails                                                                                                          | `chain`, `success`                                  | All                        | Send volume, chain mix, send failure rate                           |
| `nft_viewed`                                            | An NFT's detail view opens                                                                                                                                                                                  | `chain`                                             | All                        | NFT engagement                                                      |
| `nft_sent`                                              | An NFT transfer ends, with its outcome                                                                                                                                                                      | `chain`, `success`                                  | All                        | NFT sends and their failure rate                                    |
| `network_switched`                                      | The active network changes; `chain` is the destination family                                                                                                                                               | `chain`                                             | All                        | Multi-chain use                                                     |
| `wallet_switched`                                       | The active wallet changes                                                                                                                                                                                   | —                                                   | All                        | Multi-wallet use                                                    |
| `address_book_used`                                     | A contact is saved to the address book                                                                                                                                                                      | —                                                   | All                        | Address book adoption                                               |
| `powerup_installed` (new)                               | The user installs a Powerup that was not installed                                                                                                                                                          | `powerup`                                           | All                        | Which Powerups get adopted                                          |
| `powerup_uninstalled` (new)                             | The user removes an installed Powerup, from the catalogue or from the Home tab sheet                                                                                                                        | `powerup`                                           | All                        | Which Powerups get dropped                                          |
| `swap_completed` (new to this catalog, historical name) | A swap attempt ends: `success: true` once the network confirms it, `success: false` when signing or sending fails. Backing out of the confirmation is not an attempt                                        | `from_chain: solana`, `to_chain: solana`, `success` | All where Swap is offered  | Swap volume and failure rate                                        |
| `first_swap_completed` (historical name)                | The install's first successful swap, once per install. An install that already reported it from an August–September 2026 build does not report it again                                                     | —                                                   | All where Swap is offered  | Swap activation                                                     |
| `memo_sent` (new)                                       | A memo attempt ends: `success: true` once the network confirms it, `success: false` when signing or sending fails                                                                                           | `success`                                           | All                        | Memo Powerup use                                                    |
| `payment_request_created` (new)                         | The user creates a payment request in the Payments Powerup and its code is shown                                                                                                                            | —                                                   | All                        | Payments Powerup use (the receiver's side)                          |
| `payment_request_paid` (new)                            | The wallet first finds that one of its payment requests was paid, once per request                                                                                                                          | —                                                   | All                        | Whether payment requests turn into payments                         |
| `dapp_connected` (new)                                  | The user approves a dApp's connection and the wallet grants it: the extension's connect approval (always in its own window); Mobile Wallet Adapter's authorize sheet, including its sign-in variant         | —                                                   | Extension, Android, Seeker | How many installs use Salmon with dApps                             |
| `dapp_message_signed` (new)                             | The user approves a message signature and the wallet returns it: the extension's message and off-chain message requests and its standalone Sign-In With Solana; Mobile Wallet Adapter's sign-messages sheet | —                                                   | Extension, Android, Seeker | dApp logins and message use                                         |
| `dapp_transaction_signed` (new)                         | The user approves a transaction request and the wallet returns the result: sign, sign all, or sign and send. One event per approval, however many transactions it holds                                     | —                                                   | Extension, Android, Seeker | On-chain activity that flows through dApps                          |

Props after this feature (6 keys):

| Prop                              | Values                            |
| --------------------------------- | --------------------------------- |
| `chain`, `from_chain`, `to_chain` | `solana`, `bitcoin`, `ethereum`   |
| `success`                         | `true`, `false`                   |
| `powerup` (new)                   | `swap`, `payments`, `memo`, `skr` |

Batch context `platform`: `ios`, `android`, `seeker`, `extension`. Builds older than this version keep sending `mobile` until they are updated.

What stays untracked on purpose, from the inventory of the 64 user actions:

- The consent answer itself: a decline sends nothing, by design.
- Settings preferences (language, currency, theme, explorer, developer networks, unverified tokens), renaming a wallet, profile pictures, hiding balances, editing or removing contacts, password and biometric changes, revealing the recovery phrase or a private key, removing wallets, and revoking a trusted dApp: none of them answers a reported metric.
- Receiving (opening the Receive sheet, copying the address): a weak signal of use, which is why `first_receive_viewed` left the catalog.
- Burning an NFT, viewing activity, token detail and staked SOL: no reported metric depends on them.
- A Solana Pay payment made from the payer's side is core Send: it counts as `send_completed`, with nothing linking it to the request.
- The SKR Powerup's screen: SKR builds no transaction and has no action to complete.
- Silent dApp events with no user decision: an already-approved site reconnecting, Mobile Wallet Adapter re-authorizations and deauthorizations, and a dApp disconnecting itself.

## Metrics dictionary

### Conventions for every metric

- **Population**: installs that accepted analytics, on store builds. Every figure is a lower bound of real use: installs that declined are invisible, and so is how many declined.
- **Unit**: an install, which Google Analytics calls a user. Use the "Total users" metric (distinct installs that sent any event), never a figure that depends on Google's automatic events, which the wallet does not send.
- **Stream**: filter every report to the wallet stream G-NZ4BZZ1R51; the website shares the property.
- **Month**: the calendar month in the property's reporting time zone. An event counts on the day it reached Google Analytics, which can be later than the day it happened when a device was offline.
- **History**: before this version mobile reported `platform = mobile`. For a cross-period figure, mobile is `mobile` + `ios` + `android` + `seeker`; while old builds remain in use, the four coexist.
- **Retention window**: event-level data is kept 2 months. A figure that needs individual installs across months (retention, cohorts) must be computed and recorded before its source month ages out. Retention stays at 2 months in this version (owner, 2026-10-19), because 14 months would change Privacy Policy §6.1 and §9 and store declaration D5; such figures are recorded monthly instead.

### M1. Monthly active wallets

- **Definition**: distinct installs that sent at least one event in the month.
- **Formula**: Total users, wallet stream, month; also split by `platform`.
- **Note**: "wallet" means an install, not an on-chain address. An install that only approves dApp requests is active.

### M2. App opens

- **Definition**: count of `app_opened` in the month, and opens per active wallet = that count ÷ M1.
- **Note**: the open in which the user accepts analytics is not counted (consent comes at the end of onboarding). A side panel left open all day is one open.

### M3. Platform mix

- **Definition**: M1 split by `platform`, as counts and shares.
- **Note**: Seeker is a subset of Android phones; `android` excludes it.

### M4. New wallets

- **Definition**: count of `wallet_created` + `wallet_recovered` in the month, also shown apart.
- **Note**: this counts wallets added, not new installs: a second wallet added in an existing install counts, and so does a watch-only address. A new install whose user declined at onboarding and accepted later in Settings is not counted. The report labels the figure "wallets added" and the activation rate as approximate; telling a new install's first wallet apart is out of scope for this version (owner, 2026-10-19).

### M5. Activation

- **Definition**: installs that reached their first send or their first swap in the month = count of `first_send_completed` + count of `first_swap_completed`, also shown apart (each event fires once per install).
- **Activation rate (approximate)**: installs with `first_send_completed` or `first_swap_completed` in the month ÷ installs with `wallet_created` or `wallet_recovered` in the same month (exploration with user segments).
- **Note**: the rate is approximate because the denominator also holds existing installs adding wallets. The "first" flags survive a consent withdrawal, so an install that withdraws and opts in again never reports its first send again.

### M6. Month-1 retention

- **Definition**: of the installs active in month M, the share that is active again in month M+1.
- **Formula**: cohort exploration on any event, monthly granularity, read in the first days after M+1 closes and recorded with the month it describes.
- **Note**: a reinstall or a consent withdrawal makes a new install, which reads as churn plus a new install.

### M7. Powerup adoption

- **Definition, per Powerup**:
  - Installs in the month: count of `powerup_installed` with that `powerup`.
  - Removals in the month: count of `powerup_uninstalled` with that `powerup`.
  - Active users of the Powerup in the month: distinct installs with its core action event: Swap `swap_completed` with `success = true`; Memo `memo_sent` with `success = true`; Payments `payment_request_created`. SKR has no action event: its figure is installs only.
- **Note**: how many installs have a Powerup installed right now is not measurable: installation is a state on the device and events record changes, not states.

### M8. Swap usage

- **Definition**: swaps completed = count of `swap_completed` with `success = true`; swapping installs = distinct installs with that event; first swaps = count of `first_swap_completed`; swap failure rate = `success = false` ÷ all `swap_completed`.
- **Note**: the failure rate is per attempt: a user who fails once and retries counts one failure and one success.

### M9. Payments usage

- **Definition**: requests created = count of `payment_request_created`; requests seen paid = count of `payment_request_paid`; paid share = requests seen paid ÷ requests created, over the same months.
- **Note**: "seen paid" is a lower bound: the wallet only looks while the request is open or the list is on screen, so a request paid while its owner never reopens the Powerup is not counted, and one can be counted a month after it was created.

### M10. dApp usage

- **Definition**: connecting installs = distinct installs with `dapp_connected`; dApp transactions = count of `dapp_transaction_signed`, and transacting installs = distinct installs with it; dApp messages = count of `dapp_message_signed`. Split by `platform`: `extension` is the browser provider, `android` and `seeker` are Mobile Wallet Adapter (iOS has no Mobile Wallet Adapter).
- **Note**: which dApps are used is not measurable, by decision 3. A site the user approved before reconnects silently and is not counted again.

### M11. Send usage

- **Definition**: sends completed = count of `send_completed` with `success = true`, split by `chain`; sending installs = distinct installs with it; send failure rate = `success = false` ÷ all `send_completed`.
- **Note**: transfers a dApp asks for are counted under M10, not here.

### Not measurable with this design

- Opt-in rate, and anything about installs that declined.
- People: one person can be several installs.
- Money: balances, amounts, volume, fees.
- Which dApps, tokens or addresses are involved.
- Abandoned attempts: an action the user starts and leaves before submitting.
- How many installs hold a Powerup at a given moment.

## Consent copy (confirmed by the owner, 2026-10-19)

The key names stay; only the text changes, in both languages together. The Spanish follows the app's rioplatense voseo.

`settings.analytics_prompt_body` (the onboarding consent screen):

- en: "Salmon gets better when we understand what works. Share <bold>pseudonymous usage data</bold> — only how often you open the app, which features get used and whether they succeed. It's tied to a <bold>random identifier</bold>, never to your wallet: <bold>no addresses, no balances, no keys</bold>."
- es: "Salmon mejora cuando entendemos qué funciona. Compartí <bold>datos de uso pseudónimos</bold>: solo cada cuánto abrís la app, qué funciones se usan y si andan bien. Van atados a un <bold>identificador aleatorio</bold>, nunca a tu billetera: <bold>sin direcciones, sin balances, sin claves</bold>."

`settings.analytics_description` (the Settings toggle):

- en: "Share pseudonymous usage stats, like how often you open the app and which features you use, to help improve Salmon. Never includes addresses, balances, or amounts. Off by default."
- es: "Compartí estadísticas de uso pseudónimas, como cada cuánto abrís la app y qué funciones usás, para ayudar a mejorar Salmon. Nunca incluye direcciones, balances ni montos. Desactivado por defecto."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Monthly figures a backer can trust (Priority: P1)

At the start of each month the owner produces the previous month's figures (M1–M11) from Google Analytics by following the metrics dictionary alone, and a second person following the same text gets the same numbers.

**Why this priority**: the raise needs figures that survive a backer's questions; a figure without a written definition cannot be checked.

**Independent Test**: two people compute M1, M4 and M8 for the same month from the dictionary and compare.

**Acceptance Scenarios**:

1. **Given** a month of production data, **When** the owner follows a metric's definition, **Then** the figure comes out of Google Analytics without asking anyone what an event means.
2. **Given** a month that spans old and new builds, **When** the owner splits by platform, **Then** the dictionary says how `mobile` combines with `ios`, `android` and `seeker`.

### User Story 2 - How often Salmon is opened, per platform (Priority: P1)

An install that accepted analytics reports each app open, and every batch names the platform precisely: iPhone, Android phone, Seeker or extension.

**Why this priority**: monthly active wallets and the platform mix are the first figures any backer asks for, and without `app_opened` an install that only looks at its balance is invisible.

**Independent Test**: on each platform, open the app, send it to the background, open it again, and check that two `app_opened` events arrive with the right platform.

**Acceptance Scenarios**:

1. **Given** consent was given, **When** the user opens the app, sends it to the background and returns, **Then** two opens are recorded.
2. **Given** a Seed Vault confirmation or a permission dialog covers the app, **When** the user returns from it, **Then** no open is recorded.
3. **Given** a dApp opens an approval window (extension) or sheet (Mobile Wallet Adapter), **When** it shows, **Then** no open is recorded.
4. **Given** a Seeker, **When** a batch leaves, **Then** its platform is `seeker`, never `android`.

### User Story 3 - Powerup adoption and use (Priority: P1)

Installing and removing a Powerup, and completing its core action, are recorded per Powerup.

**Why this priority**: Powerups are the product's thesis for backers; adoption per Powerup is the evidence.

**Independent Test**: install Memo, send a memo, remove Memo; check `powerup_installed {powerup: memo}`, `memo_sent {success: true}` and `powerup_uninstalled {powerup: memo}` arrive in order.

**Acceptance Scenarios**:

1. **Given** Swap is installed, **When** a swap is confirmed by the network, **Then** `swap_completed` with `success: true` arrives, and on the install's first swap `first_swap_completed` too.
2. **Given** a swap attempt fails, **When** the confirmation shows the failure, **Then** `swap_completed` with `success: false` arrives; **Given** the user backs out, **Then** nothing arrives.
3. **Given** a payment request was created, **When** the wallet first finds it paid, **Then** `payment_request_paid` arrives once.

### User Story 4 - dApp usage without dApp identity (Priority: P2)

Approved connections, messages and transactions from dApps are counted on the extension and on Mobile Wallet Adapter, with nothing that identifies the dApp.

**Why this priority**: dApp use shows the wallet is used beyond holding, but it follows the platform figures.

**Independent Test**: from the test dApp, connect, sign a message, sign a transaction and deny one request; three events arrive, none carries a name, origin, domain or icon, and the denial sends nothing.

**Acceptance Scenarios**:

1. **Given** the extension approval window closes right after an approval, **When** the window is gone, **Then** its event still arrives.
2. **Given** a site the user approved before reconnects silently, **Then** no event arrives.

### User Story 5 - Clean data in production (Priority: P1)

Production Google Analytics receives only store-build traffic, accepts every v2 event from the first day a v2 build is in users' hands, and loses no event because a window closed.

**Why this priority**: a figure padded by the team's test devices, or missing the events a closing popup dropped, is not trustworthy.

**Independent Test**: run a staging build and an e2e run with consent on; the staging backend accepts their events and production Google Analytics shows none.

**Acceptance Scenarios**:

1. **Given** a simulator, dev client, internal build or e2e run, **When** it sends analytics, **Then** the batch reaches the staging backend (or a local backend the developer configured), never production.
2. **Given** the backend's allow-list, **When** the first v2 build ships, **Then** the backend already accepts every new event, the `powerup` prop and the new platform values, and still accepts `mobile` from old builds.

### Edge Cases

- A batch from a v2 build reaching a backend without the v2 allow-list: new events are dropped as rejected, a batch holding only new events is refused and retried every 30 seconds, and the new platforms are recorded as `unknown`. FR-019 forbids that order.
- Seed Vault detection answers after the app starts: no batch leaves before the platform is known.
- The extension side panel closed within a second of opening: its `app_opened` still arrives (FR-015, FR-016).
- The app killed by the operating system with events in memory: events recorded before the app went to the background were sent then; nothing else is promised.
- Consent withdrawn while a batch is in flight: the queue is dropped, as today.
- A Powerup turned off by the backend's switch while installed: no `powerup_uninstalled`, because the user removed nothing.
- Installing a Powerup already installed, or removing one already removed: nothing is recorded.
- A build with Powerups compiled out: no Powerup event can fire.
- The extension closes an approval window the moment the request is answered: the event recorded in it must already be on its way (FR-015).
- A Mobile Wallet Adapter request that starts the app's process: no `app_opened`; its dApp events still arrive with the right platform.
- A multi-transaction approval (sign all): one `dapp_transaction_signed`.
- A device offline for days: events arrive when it reconnects (up to the 200-event queue bound) and count on the day they reach Google Analytics.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The catalog holds exactly the 20 events and 6 prop keys of the tracking plan; the 9 existing events keep their names, triggers and props.
- **FR-002**: `powerup` accepts only the registry's Powerup ids (`swap`, `payments`, `memo`, `skr`); a Powerup added later adds its id to both allow-lists before it ships.
- **FR-003**: `app_opened` fires once per app open as defined above, on every platform, and never for a dApp approval window or sheet, a Seed Vault screen, a permission dialog or a system overlay.
- **FR-004**: On mobile a new session starts at each app open, so a session means "one open" on mobile and "one window" on the extension. Google Analytics' session counts for mobile change meaning from this version (before, one session per app start).
- **FR-005**: The batch `platform` is `ios`, `android`, `seeker` or `extension`; `seeker` comes from the same secure Seed Vault check that offers the SKR Powerup, and no batch leaves before that check has answered; if that check has not answered within 2 seconds, or fails, the platform is `android` for that process, so the consent screen and the first batch never wait on a hung native call (supervisor decision, 2026-10-19).
- **FR-006**: `powerup_installed` / `powerup_uninstalled` fire on every user install and removal, from the catalogue or from the Home tab sheet, and only when the installed list changes.
- **FR-007**: `swap_completed` carries `from_chain: solana`, `to_chain: solana` and `success`, as the historical event did; `success: true` fires when the network confirms the swap (not when the user closes the receipt), `success: false` on each failed signing or sending attempt; backing out records nothing.
- **FR-008**: `first_swap_completed` fires once per install through the existing first-time mechanism, keyed by the historical flag (`salmon_analytics_first_swap`), so an install that already reported its first swap does not report it again.
- **FR-009**: `memo_sent` follows the same outcome rule as FR-007, with `success` only.
- **FR-010**: `payment_request_created` fires when a request is saved and shown; `payment_request_paid` fires once per request, when the wallet first records it as paid.
- **FR-011**: `dapp_connected`, `dapp_message_signed` and `dapp_transaction_signed` fire on the extension (every provider path that reaches the approval window the background opens; approvals never render inside the side panel) and on Mobile Wallet Adapter, as the tracking plan defines, and carry no prop at all.
- **FR-012**: dApp events count completed approvals only: a denial, a request the dApp abandons, a closed sheet or a signing failure records nothing. Reason: on both platforms a dApp leaving or a sheet closing is answered as a decline, so a denial count would mix user decisions with screen lifecycle; and `success` keeps one meaning across the catalog (the outcome of an action the user approved), with no new prop key.
- **FR-013**: No event, prop or batch field carries a dApp's name, origin, domain, icon or any value derived from them; the guardrail rejects any prop key outside the allow-list, as today.
- **FR-014**: Every build other than a store build sends analytics to the staging backend, or to a local backend when the developer configured one; only store builds reach production. The routing adds no field to any event or batch. The Firefox package's reproducible build stays reproducible.
- **FR-015**: Events recorded in an extension window are delivered when that window closes or hides, and on mobile when the app goes to the background, so no event is lost because a window closed before the 30-second send.
- **FR-016**: `app_opened` is decided after the stored consent has been read, so an open is neither dropped as "no consent" nor sent without consent.
- **FR-017**: The consent copy changes to the strings above in English and Spanish (confirmed by the owner on 2026-10-19); the key names stay.
- **FR-018**: `docs/ANALYTICS.md` is rewritten as the ground-truth tracking plan and metrics dictionary of this spec. It corrects what it states wrongly today: 9 events (not 11), no `web` platform, the onboarding events measurable through the consent-first deferral, the real NFT detail locations, `nft_sent` carrying `success` on both outcomes, and the flush that loses events in short-lived windows (fixed by FR-015).
- **FR-019**: Release order: the backend accepts the new events, the `powerup` prop and the platforms `ios`, `android` and `seeker` (and still accepts `mobile`) on staging and then production before any app build that sends them is distributed, including internal builds.
- **FR-020**: Verification covers every new event end to end: app → ingest → the local backend's NDJSON record, through the extension's Playwright coverage specs and the mobile Maestro flows (Android emulator for Mobile Wallet Adapter, a Seeker for `seeker`); then a staging run answered with every event accepted and none rejected; then Google Analytics realtime in production after release.
- **FR-021**: The wallet stores which consent text an install accepted: `v1` for the text before this version, `v2` for the FR-017 text. An install whose stored consent predates `v2` keeps sending only the 9 events of the v1 catalog, and none of the 11 new events (including `app_opened`), until it has been shown the `v2` text. How that text is shown to those installs — a new acceptance, or a prominent notice with a one-tap off switch — is decided after the lawyer answers LS-006; the version record and the v1-only filter ship in this version either way. An install that accepts the `v2` text sends the full catalog. Owner decision, 2026-10-19.

### Cross-repo contract (salmon-wallet-backend)

Changes the plan will need in the backend, read from its `origin/main`; they ship and deploy before the app (FR-019):

- `src/analytics/event-schema.js`: add the 11 new event names; add `powerup` to the allowed prop keys with its closed list; align `success` with the app, which rejects a string value.
- `src/analytics/handler.js`: add `ios`, `android` and `seeker` to the accepted platforms, keeping `mobile` and `extension`; any other value keeps mapping to `unknown`.
- The tests under `src/analytics/__tests__/` and the backend's `docs/ANALYTICS.md`.
- Staging keeps its file sink: it validates and accepts but forwards nothing to Google Analytics, which is why the production check in FR-020 is the only Google Analytics check.

### Google Analytics configuration (owner, in the Google Analytics interface)

- Register the event-scoped custom dimension `powerup` before the first v2 build reaches users, so its first events already carry it. Registered today: `app_version`, `chain`, `from_chain`, `platform`, `success`, `to_chain`.
- Mark as key events: `wallet_created`, `wallet_recovered`, `first_send_completed`, `first_swap_completed`.

### Legal and store impact

Requirements:

- **LS-001**: Terms and Conditions 1.5 do not mention analytics: no change.
- **LS-002**: Privacy Policy §6.1 describes analytics as "events from a limited catalog to understand feature usage", with batches carrying "a session identifier ..., the platform and the app version". The new events fit that wording, the platform split is still "the platform", and the build routing adds no field. For accuracy the section adds "and how often the app is opened", in English, Spanish and Portuguese, published before or with the release.
- **LS-003**: Store declarations row D5 ("closed allow-list of 9 events") changes to 20 events. The categories stay: Apple "Product Interaction" ("Such as app launches, taps, clicks…", developer.apple.com/app-store/app-privacy-details) and Play "App interactions" ("Information about how a user interacts with the app.", support.google.com/googleplay/android-developer/answer/10787469); the Chrome Web Store "User activity" answer stays. Both mobile stores require the answers to stay accurate; Apple's can change without an app update.
- **LS-004**: dApp events carry no dApp identity (FR-013), so Apple "Browsing History" and Play "Web browsing history" stay out of scope. The extension's existing lookup of a dApp's name and icon, which sends the site's origin to Salmon's servers under the same consent, is unchanged and already disclosed in the Privacy Policy.
- **LS-005**: `seeker` is read as part of "the platform"; this reading is confirmed when the store forms are filled.

- **LS-006**: Open question for a lawyer, before release: whether installs that consented under the v1 text must accept the v2 text again, or whether a prominent notice of the change with a one-tap off switch is enough. Sources read on 2026-10-19: EDPB Guidelines 05/2020 on consent, v1.1 — informed consent needs "what (type of) data will be collected and used" (para. 64), and "If the processing operations change or evolve considerably then the original consent is no longer valid" (para. 110); Brazil, LGPD art. 8 §6 — a change to the purpose or the "forma e duração do tratamento" (art. 9 I–II) must be notified "com destaque de forma específica do teor das alterações", and the holder may revoke; Argentina, Ley 25.326 art. 5 — consent must be "libre, expreso e informado", with no rule on later changes. Until the answer, FR-021 keeps v1 consents limited to the v1 catalog, so no new event is recorded under a text that did not describe it.

Follow-ups in the SOT vault, done by the supervising session: `03-dev/Frontend Analytics and Privacy Model.md` (its claim that first-onboarding events cannot be measured), `03-dev/Stores/Store Privacy Declarations.md` (D5), `06-operations/Processes/Privacy Policy Evidence.md`, and the Privacy Policy wording in the three languages.

### Key Entities

- **Event**: a name from the closed catalog, its props, and the moment it was recorded.
- **Prop**: a key from the allow-list with a value from its closed list (or a boolean for `success`).
- **Batch context**: install identifier, session identifier, platform and app version, attached to every batch.
- **Install**: the random identifier one consenting copy of Salmon holds until consent is withdrawn or the app is removed.
- **Metric**: a written definition over events, filtered to the wallet stream, computed per calendar month.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In the verification run every one of the 20 events arrives at least once from each platform where it can fire, with the props of the tracking plan, and the ingest rejects none.
- **SC-002**: 10 of 10 extension windows closed within 2 seconds of their event (side panel opens, approval windows) deliver it.
- **SC-003**: During the verification period production Google Analytics shows no event from simulators, dev clients, internal builds or e2e runs, while the staging backend accepts theirs.
- **SC-004**: Within 48 hours of the first users updating, production realtime shows `app_opened`, at least one Powerup event with `powerup` filled, and the platforms `ios`, `android` and `extension`.
- **SC-005**: Two people computing M1, M4 and M8 for the same month from the dictionary alone get the same figures.
- **SC-006**: `docs/ANALYTICS.md` lists exactly the events, prop keys, prop values and platforms that both allow-lists accept.
- **SC-007**: The Privacy Policy and the store declarations name the new catalog before the release reaches the stores.

## Assumptions

- Store builds are the `production` profile (App Store, Google Play), the `dapp-store` profile (Solana dApp Store), the `production-apk` sideload APK (it inherits the `production` channel) and the extension packages the release workflow builds for the Chrome Web Store and Firefox Add-ons; the `testflight` and `staging` profiles already talk to the staging backend.
- The staging backend accepts events and keeps them nowhere lasting (its file sink writes to temporary storage), which is enough for team noise.
- A single store install confirms Google Analytics realtime after release (FR-020) and withdraws consent right after, which deletes its install identifier; it is the one team install that opts in on purpose.
- Team members decline analytics on their personal store installs.
- Powerup events fire only in builds with Powerups compiled in.
- The Swap Powerup is offered where the backend's switch and the network allow it; its events need no other condition.

## Where each trigger lives today (for planning)

| Trigger                                   | Code                                                                                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client, batching, session id per instance | `packages/shared/src/analytics/client.ts:42`, `:150`, `:166`, `:202`                                                                                                                                          |
| Catalog, props, platform type             | `packages/shared/src/analytics/events.ts:19`, `:63`; `types.ts:8`                                                                                                                                             |
| First-time and deferred onboarding events | `packages/shared/src/analytics/first-time.ts:23`; `deferred.ts:23`                                                                                                                                            |
| Client start                              | `apps/mobile/index.js:182`; `apps/extension/src/entrypoints/popup/main.tsx:24`; `sidepanel/main.tsx:22`                                                                                                       |
| Mobile background rule (lock)             | `apps/mobile/app/_layout.tsx:269`; Seed Vault screens `apps/mobile/src/seed-vault/bridge.ts:60`                                                                                                               |
| Extension approval-window detection       | `apps/extension/src/entrypoints/popup/App.tsx:96`; side panel or window routing and window close after the answer `apps/extension/src/entrypoints/background.ts:225`, `:513`                                  |
| Seeker detection                          | `apps/mobile/src/seed-vault/bridge.ts:111`; `useDeviceCapabilities.ts:11`                                                                                                                                     |
| Install / uninstall                       | `packages/shared/src/hooks/useInstalledPowerups.ts:102`, `:111`                                                                                                                                               |
| Powerup confirmation outcome (Swap, Memo) | `packages/shared/src/core/confirmation/SignatureRequestContext.tsx:130` (success `:143`, failure `:166`, cancel `:171`); `powerups/swap/useSwapScreenLogic.ts:515`; `powerups/memo/useMemoScreenLogic.ts:114` |
| Historical swap events                    | commit `61b26d60` (removed `swap_completed`, `first_swap_completed`, `ANALYTICS_FIRST_SWAP`)                                                                                                                  |
| Payments create / paid                    | `packages/shared/src/powerups/payments/usePaymentsScreenLogic.ts:294`, `:355`                                                                                                                                 |
| SKR (read-only)                           | `packages/shared/src/powerups/skr/manifest.ts:3`                                                                                                                                                              |
| Extension dApp approvals                  | `apps/extension/src/pages/dapp/useDAppApproval.ts:41`; `DAppConnectPage.tsx:34`; `DAppSignMessageApprovalPage.tsx:51`; `DAppSignInApprovalPage.tsx:54`; `DAppTransactionApprovalPage.tsx:80`                  |
| Mobile Wallet Adapter approvals           | `apps/mobile/src/mwa/MwaRequest.tsx:241` (connect), `:306` (messages), `:380` (transactions)                                                                                                                  |
| Build environment                         | `packages/shared/src/api/config.ts:144`; `apps/mobile/eas.json`; `apps/extension/wxt.config.ts:60`                                                                                                            |
| Consent copy                              | `packages/shared/src/locales/{en,es}/translation.json:229`, `:231`                                                                                                                                            |
| Backend mirror                            | backend `src/analytics/event-schema.js:13`, `:27`; `handler.js:26`; staging sink `config/env.staging.yml:73`                                                                                                  |
