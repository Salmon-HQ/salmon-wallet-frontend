# Quickstart: atomic wallet save (spec 046)

## 1. Automated checks

```bash
export PATH="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.21.0/bin:$PATH"
pnpm turbo run test --filter=@salmon/shared     # crash double positions, note and discard, duplicate rule, marks, add flow, scan
pnpm turbo run test --filter=@salmon/ui         # PasswordPage: same account on retry, duplicate message
pnpm turbo run test --filter=@salmon/mobile     # password route: phrase cleared on save, put back only when nothing was saved
pnpm turbo run test --filter=@salmon/extension  # App: authData cleared on password success
pnpm test:security
pnpm typecheck && pnpm lint && pnpm check:parity && pnpm check:i18n && pnpm check:dead-code && pnpm check:cycles
```

Red first (each seen failing on this branch before its code; the full list with guards is plan.md §Test plan):

- First save fails at the list; retry with another password; relaunch → the vault opens with the second password (today: the first). Needs the key-sensitive cipher.
- First save stopped after the vault, note present → relaunch shows welcome (today: lock screen).
- Seed Vault replace stopped after the vault write → every listed id has its vault entry (today: the replaced wallet is listed without one).
- Add C failing at the counter write → resolves, memory shows C (today: rejects with C stored and memory already changed before the first write).
- Two windows add the same phrase → one wallet.
- A stale window adds C after another added D → it reloads and shows D.
- A setup screen's second submit after a landed-but-failed save → same id, one wallet.

Guards (pass today, must stay green): vault + empty list + no note → lock screen; `WALLETS` or cleartext vault → nothing removed; removal keeps every listed id's entry; `clearAll` clears memory first.

Parity before the change: cross-platform 2248 / 2265, same-side 870 / 870 (`cloneLines`). Measure again at the screens commit.

## 2. E2E

No new flow (research R12). These must stay green (FR-024):

| Suite      | Files                                                                                                                                                     | Why it matters here                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Playwright | `analytics-consent-prompt.spec.ts`, `helpers.ts` `unlockOrRecover`                                                                                        | setup save, `authData` cleared on success        |
| Playwright | `legacy-migration.spec.ts`                                                                                                                                | no discard on storage shape                      |
| Playwright | `lock.spec.ts`, `auto-lock.spec.ts`                                                                                                                       | launch takes one lock turn first                 |
| Maestro    | `subflows/onboard-walletA.yaml`, `onboard-walletB.yaml`, `recover-walletA.yaml`, `recover-walletB.yaml`, `import-account.yaml`, `seed-vault-confirm.yaml` | setup and Add wallet saves on iPhone and Android |
| Maestro    | `flows/actions/reset/remove-all-wallets.yaml`                                                                                                             | `clearAll` order                                 |

Maestro runs from `apps/mobile/.maestro/` (`./run.sh`).

## 3. Hand test (both apps)

1. Extension, two side panels: add a wallet from a new phrase in one; import the same phrase in the other (not reloaded) → "This wallet is already in your list."; Wallets shows it once, and the second panel shows the new wallet.
2. Add wallet → import the phrase of a listed wallet → the same message.
3. Add wallet → derive position 1 of the active wallet → saved; derive position 1 again → refused.
4. Import a private key whose address a phrase wallet shows → refused.
5. Mobile setup, create: finish; the first send asks for the phrase check.
6. Seeker: add a Seed Vault account already listed (after re-granting access) → one wallet.

## 4. Owner sign-offs

- Human sign-off on the write order, the discard and the new storage key (constitution III; `docs/ARCHITECTURE.md:42`); adversarial review of the final diff before merge.
- Plan questions 1–3 and the known limitations (plan.md).
