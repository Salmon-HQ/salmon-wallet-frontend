# Data model: Analytics catalog v2

What the client holds, where, and how it changes. The wire format is in [contracts/analytics-events-v2.md](./contracts/analytics-events-v2.md).

## Client (one per JS runtime: each extension window, the mobile process)

| Field        | Kind                                            | Lifetime                           | Rule                                                                                                                         |
| ------------ | ----------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `platform`   | `'ios' \| 'android' \| 'seeker' \| 'extension'` | runtime                            | Resolved in `bootstrap()`; no batch before it is known (FR-005)                                                              |
| `storeBuild` | boolean                                         | runtime                            | Resolved in `bootstrap()`; picks the transport URL (FR-014). Default `false`                                                 |
| `consent`    | boolean, plus "not read yet" until `ready`      | runtime, mirrored in storage       | Events tracked before `ready` wait for it (FR-016)                                                                           |
| `installId`  | random UUID                                     | storage until consent is withdrawn | Unchanged                                                                                                                    |
| `sessionId`  | random UUID                                     | memory                             | New per client; on mobile also new at each return-open (`startSession`, FR-004)                                              |
| `queue`      | events, at most 200                             | memory                             | Flushed every 30 s, at 20 events, on hide/background, and before a session rotates; sent in requests of at most 100 (FR-015) |

State of an event: tracked → (held until `ready`) → validated → queued → sent → accepted or re-queued on failure. Withdrawing consent empties the queue, as today.

## Persisted keys (existing storage, no new data)

| Key                                                                                            | Meaning                                          | Change                                                                                                                           |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `salmon_analytics_consent`, `salmon_analytics_consent_prompted`, `salmon_analytics_install_id` | Consent, prompt answered, install id             | none                                                                                                                             |
| `salmon_analytics_first_send`                                                                  | `first_send_completed` reported                  | none                                                                                                                             |
| `salmon_analytics_first_swap`                                                                  | `first_swap_completed` reported                  | constant restored (`STORAGE_KEYS.ANALYTICS_FIRST_SWAP`); installs that ran August–September 2026 builds already hold it (FR-008) |
| `salmon_analytics_pending_onboarding_event`                                                    | Onboarding event parked until the consent answer | none                                                                                                                             |

## Mobile open rule (`apps/mobile/src/analytics/appAnalytics.ts`)

| Flag          | Set                                                                                                                        | Cleared                  | Effect                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------- |
| `started`     | first `RootLayoutNav` mount                                                                                                | never (process lifetime) | Cold open tracked once                                    |
| `away`        | where the lock rule fires (`background` from active/inactive, no Seed Vault screen; or Seed Vault closed while not active) | on the next counted open | `active` with `away` → rotate session, track `app_opened` |
| `mwaOnScreen` | MWA component provider runs                                                                                                | `MwaRoot` unmounts       | `active` while set is not an open                         |

## Per-surface outcome hooks

- `TransactionProposal.onOutcome(success)`: called by core once per signing attempt; Swap → `swap_completed` (+ `first_swap_completed` on the first success), Memo → `memo_sent`.
- Payments: an in-memory set of request ids already reported paid, per mounted screen, on top of the stored `status: 'paid'`.
- dApp approvals: one event per approved request, tracked before the answer leaves; nothing on deny, close or failure.
