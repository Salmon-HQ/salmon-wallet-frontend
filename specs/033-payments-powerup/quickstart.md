# Quickstart: Payments (spec 033)

## Run it

```bash
# backend (docker, local stage lists `payments`)
cd ../salmon-wallet-backend && git checkout feat/powerups-foundations && docker compose up

# mobile (Powerups on)
EXPO_PUBLIC_POWERUPS=on pnpm --filter @salmon/mobile start

# extension (dev build reads the local .env, Powerups on)
pnpm --filter @salmon/extension dev        # load apps/extension/dist/chrome-mv3-dev
```

Install the Powerup from the catalogue (`+` on Home → Payments → read the disclosure → `+`). The tab appears beside Portfolio | NFTs.

## Hand-test (the owner drives the device; nothing here is automated)

1. **Ask (devnet)**: type `0.5`, a note, keep 24 h, Create. The sheet rises with the QR. Scan it with Phantom or Solflare on devnet: recipient, 0.5 USDC, the note. Copy → paste the text into another Solana Pay wallet: same fields.
2. **Paid**: pay it from that second wallet. Within ~10 s of finality the sheet's Status row reads Paid, "Paid by" shows the payer, the explorer link opens the transaction. The list row agrees. Reopen the app: still paid.
3. **Not a payment**: create a second request; from the other wallet send a _different_ amount of USDC to the same address (plain send). The request stays pending; Activity shows the incoming transfer.
4. **Expired**: create with 1 h, change the device clock forward two hours, reopen the tab: Expired, no QR offered, row kept. Remove it from the sheet.
5. **Pay (Salmon → Salmon)**: on a second Salmon device, Send → scan the first device's QR. Review shows Requested by / For, amount and token locked, no amount step. Confirm. The first device flips to Paid. Check the transaction in the explorer: memo instruction right before the transfer, the reference key on the transfer instruction.
6. **Pay a Salmon Pay request**: create one in the Salmon Pay dashboard on devnet, scan it from Salmon, confirm; the dashboard's status flips to paid.
7. **Not held**: scan a request for a mint the account does not hold → the review says so, confirm disabled. Scan `solana:https://…` → refused with the transaction-request message.
8. **Extension**: paste a request URI into the field under the recipient input → the locked review. Paste a bare address → today's behaviour.
9. **Off**: flip `payments` to `maintenance` on the local stage → the tab shows the reason; requests are still there when it comes back.

## Gates before the owner reviews the branch

```bash
pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/ui --filter=@salmon/mobile --filter=@salmon/extension
pnpm check:parity && pnpm check:i18n && pnpm check:no-secrets
pnpm --filter @salmon/extension build && pnpm check:manifest
pnpm check:powerups-bundle apps/extension/dist/chrome-mv3     # off build: no marker
pnpm test:coverage
```

## Copy — Spanish from the owner (blocks the i18n gate)

English keys are listed in `contracts/ui-contracts.md` (`payments.*`) and `contracts/send-request.md` (`send.request.*`). The implementation lands the English strings and the Spanish file with the same keys **only once the owner has written them**; until then the i18n check fails on purpose rather than shipping a guess.

## Owner sign-offs recorded in this lot

- `packages/shared/src/blockchain/solana/transfer.ts` changes (references on the transfer instruction, memo on the SOL path) — constitution III, explicit yes required.
- The kit change `QRCode.brandKnockout` (runbook §4 gap, closed here).
- The `usePowerupState` storage seam (a core hook the boundary allows Powerups to import).
- Backend registry entry on `prod` enabled or held.
- The optional follow-ups: the extension's `solana:` protocol handler; SOL and other tokens on the asking side; a server-side record (link, cross-device, webhooks, x402).
