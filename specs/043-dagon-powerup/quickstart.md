# Quickstart: verify the Dagon Powerup (devnet preview)

How to check the feature once it is built, from the fastest check to the device. Nothing here sends a transaction until §3, and every transaction in §3 is confirmed by a person.

## 1. Prerequisites

- Branch `feat/dev-93-dagon-powerup` checked out in this repo; `.specify/feature.json` points to `specs/043-dagon-powerup`.
- The backend half (`salmon-wallet-backend`, same branch name, spec 023) deployed to the staging stack, with `dagon` enabled for `staging` and the availability row iOS-only. Probe: `GET {staging API}/v1/solana-devnet/powerups/dagon/build?publicKey=<team wallet>&action=setup&side=USDC&freshSigners=<any fresh base58 key>` answers an envelope or `409 already_initialized`.
- Team wallets funded: devnet SOL from the public faucet; 1000 mock-USDC and 1000 mock-DOGE from Dagon (GUIDE §10, 4 h cooldown).
- EN and ES strings approved by the owner (D6).
- Node 24.21.0 on the PATH (`.nvmrc`).

## 2. Automated checks

```bash
pnpm turbo run typecheck lint test --filter=@salmon/shared --filter=@salmon/mobile
pnpm check:parity
pnpm check:i18n
pnpm check:no-secrets
pnpm test:coverage            # thresholds unchanged or raised
```

Existing core tests must pass with their files unmodified:

```bash
git diff --stat origin/staging -- 'packages/shared/src/core/**/*.test.*' 'packages/shared/src/blockchain/**/*.test.*'
# expected: only the new *.cosigners.test.ts, fresh-signers.test.ts and SignatureRequestContext.fresh.test.tsx
```

Powerups-off bundle (SC-008):

```bash
cd apps/mobile
EXPO_PUBLIC_POWERUPS=off npx expo export --platform ios --output-dir "$TMPDIR/dagon-off"
cd ../.. && pnpm check:powerups-bundle "$TMPDIR/dagon-off"   # 'dagon.catalog' must be absent
```

What the new tests prove, by requirement: FR-040/SC-004 refusal on mainnet, for an undeclared id and for a wrong or extra signer (`SignatureRequestContext.fresh.test.tsx`, `solana-transaction.cosigners.test.ts`); FR-043 one signing step after the blockhash swap (`solana.cosigners.test.ts`); FR-044 read-message bytes and viewer-only signing (`fresh-signers.test.ts`); SC-005 no key in the build argument, the result or storage; SC-006 the lint fixtures (`boundary.test.ts`); SC-003 no reveal without a confirmation (`useDagonScreenLogic.test.tsx`, `DagonScreen.test.tsx`).

## 3. iPhone simulator against devnet (manual)

```bash
cd apps/mobile
EXPO_PUBLIC_SALMON_ENV=staging EXPO_PUBLIC_POWERUPS=on npx expo run:ios --device "<simulator UDID>"
```

In the app: import a pre-funded team wallet, switch the network to devnet, open the Powerups catalogue, add "Dagon (devnet preview)", open its tab.

| Step | Expect |
| --- | --- |
| First visit | usage line, devnet notice, only "Activate" (US1-1) |
| Activate, confirm twice (one per mock token) | receipts say submitted, Encrypt is processing; two "In progress" items reach "done" or "outcome unknown" within 90 s; cards show public balance and "not revealed yet" (US1-2/3) |
| Hide 10.00 USDC | public balance drops by 10.00; item "done"; card "may be out of date" (US2) |
| Reveal USDC | the confirmation states the cost before confirming; the card shows the hidden balance and its time; reopening the tab shows the same value with no new transaction (US3) |
| Swap 1.00 USDC to DOGE | confirmation shows amount in, minimum out and the devnet-floor caveat; receipt never claims a fill (US4) |
| Reveal DOGE | the increase is visible |
| Kill the app with an item processing, reopen | the item is still listed and resolves (US5) |
| Switch to mainnet | the tab disappears |

Send and Withdraw stay off in this run (switches in `powerups/dagon/constants.ts`). Withdraw's three steps are exercised once with the switch on, outside the demo, before the build is frozen (SC-007).

## 4. EAS `staging` build (manual)

```bash
cd apps/mobile
eas build --profile staging --platform ios
```

Internal distribution to the team's registered iPhones on the `staging` channel. Never `--profile production`, never `eas submit`, never TestFlight (FR-001, D2). The change is JS-only, so `app.json` `expo.version` and `native-fingerprint.json` stay as they are.
