# Quickstart: atomic wallet save (spec 046)

## 1. Automated checks

```bash
export PATH="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.21.0/bin:$PATH"
pnpm turbo run test --filter=@salmon/shared     # crash double (faults, read faults, fresh runtimes, no-locks suite), Rules 1-2, own-id rule, password proof, duplicate rules, marks
pnpm turbo run test --filter=@salmon/ui         # PasswordPage: same id and avatar on retry, messages
pnpm turbo run test --filter=@salmon/mobile     # password route: phrase cleared on save, messages
pnpm turbo run test --filter=@salmon/extension  # App: authData cleared, listener reload waits for the lock
pnpm test:security
pnpm typecheck && pnpm lint && pnpm check:parity && pnpm check:i18n && pnpm check:dead-code && pnpm check:cycles
```

Red first (full list with guards in plan.md §Test plan):

- Save or remove with another password while a cached key is valid → rejected as a wrong password, one failed unlock (today: saved under the first).
- First save whose vault write failed, retried with another password → the vault opens with the new one only.
- Dropped or garbled vault read on an add and on a removal → rejects, other wallets' entries intact (today: rewritten without them).
- Dropped list read while the window holds wallets, on add, remove and edit → rejects, nothing written.
- List write applied then thrown, on the extension, on setup create, setup recover, Add wallet, remove and edit → resolves through the read-back; with the read-back failing → rejects and memory is refreshed from storage with no write and no global error (unchanged when the list read keeps failing). On mobile, Add wallet, remove and edit → reject with no read-back, no refresh, nothing written after the list, memory unchanged.
- Same id with a different stored secret → rejects, entry intact.
- Vault and list both read absent while `COUNTER` is present → rejects; a reset stopped after any of its writes still lets setup run.
- A save rejected after its vault landed → the setup form asks for the existing password in the same session.
- Mobile setup after the save: `unlockAccounts` resolving false → enrolment skipped, on to success; enrolment or analytics throwing → no error, the screen moves on.
- First save killed right after the list write → `COUNTER` present.
- A failing save beside a garbled vault with nothing listed → `requiredLock` stays false.
- With a list read that lied, a save removes no vault entry.
- A stale second window adds a wallet the first already saved → "This wallet is already in your list.", nothing stored twice.
- Seed Vault replace stopped after the vault write → every listed id has its entry.
- Marks: each kept mark asserted next to a pruned stale one; no write when nothing is stale.

Guards: an unparseable vault with nothing listed is overwritten by setup, as today; vault + absent list → launch writes nothing; `WALLETS` or cleartext vault → nothing removed; derived wallet at an unheld position saved; a phrase whose address a watched, private-key or Seed Vault wallet holds saved; no network during `addAccount`; removal keeps every listed entry; `clearAll` clears memory first.

Parity before the change: cross-platform 2248 / 2265, same-side 870 / 870 (`cloneLines`).

## 2. E2E

No new flow (research R9). Must stay green (FR-024):

| Suite      | Files                                                                                                                                                     | Why                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Playwright | `analytics-consent-prompt.spec.ts`, `helpers.ts` `unlockOrRecover`                                                                                        | setup save, `authData` cleared               |
| Playwright | `legacy-migration.spec.ts`                                                                                                                                | Rule 1 never blocks a migrated wallet        |
| Playwright | `lock.spec.ts`, `auto-lock.spec.ts`                                                                                                                       | listener reload barrier                      |
| Maestro    | `subflows/onboard-walletA.yaml`, `onboard-walletB.yaml`, `recover-walletA.yaml`, `recover-walletB.yaml`, `import-account.yaml`, `seed-vault-confirm.yaml` | setup and Add wallet saves on both platforms |
| Maestro    | `flows/actions/reset/remove-all-wallets.yaml`                                                                                                             | `clearAll` order                             |

## 3. Hand test (both apps)

1. Extension, two side panels: add a wallet from a new phrase in one; import the same phrase at the same position in the other → "This wallet is already in your list."; both panels show the wallet once after the second reloads.
2. Add wallet → import a listed phrase → the same message.
3. Derive position 1 twice → second refused; derive position 2 → saved.
4. Import a private key whose address a phrase wallet shows → refused; watch an address a wallet shows → refused with the watch-only message.
5. Watch an address, then recover the phrase that derives it → saved.
6. Mobile setup, create: the first send asks for the phrase check.
7. Seeker: add a listed Seed Vault account again → one wallet.

## 4. Owner sign-offs

Human sign-off on Rules 1–2, the write order, the password proof, the own-id rule and the fixed id (constitution III); adversarial review of the final diff; plan questions and known limitations.
