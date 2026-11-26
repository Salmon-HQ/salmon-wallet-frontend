# Quickstart: atomic wallet save (spec 046)

## 1. Automated checks

```bash
export PATH="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.21.0/bin:$PATH"
pnpm turbo run test --filter=@salmon/shared     # crash-storage positions, discard, duplicate rule, marks, add flow, scan
pnpm turbo run test --filter=@salmon/ui         # PasswordPage duplicate message and options
pnpm turbo run test --filter=@salmon/mobile     # password route: phrase put back only when nothing was saved
pnpm test:security
pnpm typecheck && pnpm lint && pnpm check:parity && pnpm check:i18n && pnpm check:dead-code && pnpm check:cycles
```

Red first, each seen failing on this branch before its code:

- First save stopped after the vault → relaunch shows the lock screen today; must show welcome.
- First save fails at the list, retry with another password → today the vault opens only with the first password.
- Add C failing at the counter write → today rejects with C stored and the window already showing C.
- Two windows add the same phrase → today two wallets.
- Seed Vault wallet listed only in storage, added again → today two wallets.
- A create-flow save that fails before the list → no mark after relaunch (today the mark stays).
- Remove the active wallet, kill after the list → active wallet listed and on a pair it holds.

Parity before the change: cross-platform 2248 / 2265, same-side 870 / 870 (`cloneLines`). Measure again at the screens commit; neither number may rise above its ceiling.

## 2. E2E

No new flow (research R12: storage cannot fail mid-save on a device without a fault hook in the build). These must stay green (FR-024):

| Suite      | Files                                                                                                                                                     | Why it matters here                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Playwright | `analytics-consent-prompt.spec.ts`, `helpers.ts` `unlockOrRecover` (every spec that recovers a wallet)                                                    | setup save and first unlock                                         |
| Playwright | `legacy-migration.spec.ts`                                                                                                                                | the discard keeps a pending v2 record's vault                       |
| Playwright | `lock.spec.ts`, `auto-lock.spec.ts`                                                                                                                       | launch now takes one lock turn before reading the vault             |
| Maestro    | `subflows/onboard-walletA.yaml`, `onboard-walletB.yaml`, `recover-walletA.yaml`, `recover-walletB.yaml`, `import-account.yaml`, `seed-vault-confirm.yaml` | setup and Add wallet saves on iPhone simulator and Android emulator |
| Maestro    | `flows/actions/reset/remove-all-wallets.yaml`                                                                                                             | `clearAll` unchanged                                                |

Maestro runs from `apps/mobile/.maestro/` (`./run.sh`).

## 3. Hand test (both apps)

1. Extension, two side panels on one wallet: in panel 1 add a wallet from a new phrase; in panel 2 (not reloaded) import the same phrase → "This wallet is already in your list."; Wallets shows it once.
2. Add wallet → import the phrase of a wallet already listed → the same message; nothing changes.
3. Add wallet → derive the account at position 1 of the active wallet → saved; derive position 1 again → refused.
4. Import a private key whose address a phrase wallet already shows → refused (as today).
5. Mobile setup, create: finish; the first send asks for the phrase check (mark present).
6. Seeker: add a Seed Vault account already listed (after re-granting access) → one wallet.

## 4. Owner sign-offs

- Human sign-off on the vault and storage write order (constitution III; `docs/ARCHITECTURE.md:42`), and an adversarial review of the final diff before merge.
- Plan questions 1–3 (plan.md §Owner questions), each built on its default until answered.
