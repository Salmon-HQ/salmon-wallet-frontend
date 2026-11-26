# Quickstart: atomic wallet save (spec 046)

## 1. Automated checks

```bash
export PATH="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.21.0/bin:$PATH"
pnpm turbo run test --filter=@salmon/shared     # crash double (faults, lying reads, fresh runtimes, no-locks suite), Rules 1-3, note, password proof, duplicate rules, marks
pnpm turbo run test --filter=@salmon/ui         # PasswordPage: same account on retry, messages
pnpm turbo run test --filter=@salmon/mobile     # password route: phrase cleared on save, messages
pnpm turbo run test --filter=@salmon/extension  # App: authData cleared, reload waits for the lock
pnpm test:security
pnpm typecheck && pnpm lint && pnpm check:parity && pnpm check:i18n && pnpm check:dead-code && pnpm check:cycles
```

Red first (full list with guards in plan.md §Test plan):

- Save or remove with another password while a cached key is valid → rejected as a wrong password, one failed unlock (today: saved under the first).
- First save stopped after its vault → welcome (today: lock screen).
- Dropped or garbled vault read on an add and on a removal → rejects, other wallets' entries intact (today: the vault is rewritten without them).
- Dropped list read while the window holds wallets, on add, remove and edit → rejects, nothing written.
- List write applied then thrown, on setup create, setup recover, Add wallet, extension back-and-forward, remove and edit → the read-back confirms it and the call resolves; when the read-back fails, the retry adopts (add) or finds the change (remove, edit); one wallet.
- A stale second window adds a wallet the first already saved → adopted, shown once with its name and picture; a window that shows it gets "This wallet is already in your list."
- Seed Vault replace stopped after the vault write → every listed id has its entry.
- Stale runtime adds C after another added D → reloads after the lock and shows D, with C active.

Guards: vault + empty list + no note → lock screen; `WALLETS` or cleartext vault → nothing removed; a stale note beside a listed wallet with a dropped list read → no discard, the save rejects; a corrupt vault beside an empty list → no note written (the save now rejects); no network during `addAccount`; removal keeps every listed entry; `clearAll` clears memory first.

Parity before the change: cross-platform 2248 / 2265, same-side 870 / 870 (`cloneLines`).

## 2. E2E

No new flow (research R12). Must stay green (FR-024):

| Suite      | Files                                                                                                                                                     | Why                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Playwright | `analytics-consent-prompt.spec.ts`, `helpers.ts` `unlockOrRecover`                                                                                        | setup save, `authData` cleared               |
| Playwright | `legacy-migration.spec.ts`                                                                                                                                | no discard without a bound note              |
| Playwright | `lock.spec.ts`, `auto-lock.spec.ts`                                                                                                                       | launch turn, reload barrier                  |
| Maestro    | `subflows/onboard-walletA.yaml`, `onboard-walletB.yaml`, `recover-walletA.yaml`, `recover-walletB.yaml`, `import-account.yaml`, `seed-vault-confirm.yaml` | setup and Add wallet saves on both platforms |
| Maestro    | `flows/actions/reset/remove-all-wallets.yaml`                                                                                                             | `clearAll` order                             |

## 3. Hand test (both apps)

1. Extension, two side panels: add a wallet from a new phrase in one; import the same phrase at the same position in the other → it resolves as already saved if that panel had not reloaded yet, or shows "This wallet is already in your list." if it had; both panels show the wallet once.
2. Add wallet → import a listed phrase in the window that shows it → "This wallet is already in your list."
3. Derive position 1 twice → second refused.
4. Import a private key whose address a phrase wallet shows → refused.
5. Mobile setup, create: the first send asks for the phrase check.
6. Seeker: add a listed Seed Vault account again → one wallet.

## 4. Owner sign-offs

Human sign-off on Rules 1–3, the write order, the bound discard, the password proof and the new key (constitution III); adversarial review of the final diff; plan questions and known limitations.
