# Quickstart: verify the Dagon Powerup (devnet preview)

How to check the feature once it is built, from the fastest check to the device. Nothing here sends a transaction until §3, and every transaction in §3 is confirmed by a person.

## 1. Prerequisites

- Branch `feat/dev-93-dagon-powerup` checked out in this repo; `.specify/feature.json` points to `specs/043-dagon-powerup`.
- Local QA (§3): the backend half (`salmon-wallet-backend`, same branch name, spec 023) running in Docker (`docker compose up` from that repo: serverless-offline, stage `local`, host port 3000, routes under `/local`), with `dagon` offered to Android on the `local` stage (the backend plan's row makes Android `maintenance`, which the gate answers with 404). Probe: `curl -s -H 'X-Salmon-Platform: android' 'http://localhost:3000/local/v1/solana-devnet/powerups/availability' | jq '.data[] | select(.id=="dagon")'` shows it enabled. The Android emulator reaches the same server at `http://10.0.2.2:3000/local`.
- Optional iOS build (§4, only if the owner asks for it): the same backend deployed to the staging stack, with `dagon` enabled for `staging` and the availability row iOS-only. Probe: `GET {staging API}/v1/solana-devnet/powerups/dagon/build?publicKey=<team wallet>&action=setup&side=USDC&freshSigners=<any fresh base58 key>` answers an envelope or `409 already_initialized`.
- Team wallets funded: devnet SOL from the public faucet; 1000 mock-USDC and 1000 mock-DOGE from Dagon (GUIDE §10, 4 h cooldown).
- EN and ES strings approved by the owner (D6).
- Node 24.21.0 on the PATH (`.nvmrc`); Android Studio with one Android emulator (AVD) created.

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
EXPO_PUBLIC_POWERUPS=off npx expo export --platform all --output-dir "$TMPDIR/dagon-off"
cd ../.. && pnpm check:powerups-bundle "$TMPDIR/dagon-off"   # 'dagon.catalog' must be absent
```

What the new tests prove, by requirement: FR-040/SC-004 refusal on mainnet, for an undeclared id and for a wrong or extra signer (`SignatureRequestContext.fresh.test.tsx`, `solana-transaction.cosigners.test.ts`); FR-043 one signing step after the blockhash swap (`solana.cosigners.test.ts`); FR-044 read-message bytes and viewer-only signing (`fresh-signers.test.ts`); SC-005 no key in the build argument, the result or storage; SC-006 the lint fixtures (`boundary.test.ts`); SC-003 no reveal without a confirmation (`useDagonScreenLogic.test.tsx`, `DagonScreen.test.tsx`).

## 3. Manual QA on the Android emulator against the local backend

The agent prepares everything up to the first screen; the owner taps every step and takes the screenshots. No Maestro. Send and Withdraw stay off for the main pass (switches in `packages/shared/src/powerups/dagon/constants.ts`); the last two blocks are run once with the switch flipped on locally and flipped back before the demo build.

Setup (agent):

```bash
# 1. local backend in Docker (repo salmon-wallet-backend, branch feat/dev-93-dagon-powerup)
docker compose up -d
curl -s http://localhost:3000/local/health   # healthy before going on

# 2. emulator: start the AVD, then build the app locally and install it on the emulator
cd apps/mobile
emulator -list-avds && emulator -avd <avd name> &
EXPO_PUBLIC_SALMON_ENV=local EXPO_PUBLIC_POWERUPS=on npx expo run:android
# with EXPO_PUBLIC_SALMON_ENV=local the app calls http://10.0.2.2:3000/local, the host's Docker backend seen from the emulator
```

Before step 1 the owner imports a pre-funded team wallet, switches the network to devnet, opens the Powerups catalogue, adds "Dagon (devnet preview)" and opens its tab. Screenshots go to `~/Desktop/dagon-qa/`, named by step number.

| # | Flow | Steps (owner) | Expected result | Screenshot |
| --- | --- | --- | --- | --- |
| 1 | First visit | Open the Dagon tab on a wallet that never activated Dagon | Usage line, the devnet notice and only "Activate"; no balances card, no other action (US1-1, FR-021) | The whole tab |
| 2 | Activate | Tap Activate; confirm on the core screen for each mock token | The confirmation shows the network fee; receipts say "submitted, Encrypt is processing", never "done"; two "In progress" items reach "done" or "outcome unknown" within 90 s; cards show the public balance and "not revealed yet" (US1-2/3) | One confirmation, one receipt, the tab after settling |
| 3 | Devnet notice | Scroll the tab in every state reached so far | The notice stays visible, cannot be dismissed (US1-4, FR-020) | — |
| 4 | Hide | Hide 10.00 mock-USDC; try typing 10.005 first | The input refuses the third decimal; the sheet says the amount is public on chain; the public balance drops by 10.00; the item reaches "done"; the card reads "may be out of date" (US2) | The sheet, the receipt, the card marked out of date |
| 5 | Reveal | Tap Reveal on mock-USDC, read the confirmation, confirm | The cost (a transaction and about 0.0023 devnet SOL of rent) shows before confirming; the card shows the hidden balance and its read time (US3-2/3) | The confirmation, the revealed card |
| 6 | No reveal on render | Leave the tab, reopen it, kill and reopen the app | Same value and time; no new transaction in the wallet's activity (US3-1, FR-023) | The card after reopening |
| 7 | Swap | Swap 1.00 mock-USDC to mock-DOGE | Confirmation shows amount in, minimum out and the "devnet does not enforce the minimum yet" caveat; the receipt never claims a fill; both cards read "may be out of date" after "done" (US4) | The confirmation, the receipt |
| 8 | Reveal the output | Reveal mock-DOGE | The increase is visible | The revealed card |
| 9 | Restart mid-operation | Hide 1.00, kill the app while the item is "processing", reopen | The item is still listed and resolves to "done" or "outcome unknown" (US5) | The item before and after |
| 10 | Cancel | Start a Hide, tap cancel on the core confirmation | Nothing is submitted; no new item | — |
| 11 | Mainnet | Switch the network to mainnet, then back to devnet | The tab disappears on mainnet and returns with its items on devnet | The Home tabs on mainnet |
| 12 | Send (switch on) | Send 1.00 mock-USDC to a second team wallet with no Dagon account | The setup for the recipient comes first as its own confirmation, then the send; the copy says a reveal is needed to know whether it moved; revealing on both wallets shows the change (US6) | Both confirmations, the receipt |
| 13 | Withdraw (switch on) | Withdraw 5.00 mock-USDC; kill the app after step 1; reopen and continue; run step 3 | The sheet warns the amount becomes public and can get stuck on devnet; the flow resumes at step 2; step 3 before the decryption is posted reads "decryption not posted yet, try again"; after step 3 the public balance rises by 5.00 (US7, SC-007) | The warning, the resumed step, the final balance |

A row that fails: the owner sends the screenshot and the row number; the agent reads the evidence before changing anything.

## 4. Optional: iOS EAS `staging` build (only if the owner asks for it)

```bash
cd apps/mobile
eas build --profile staging --platform ios
```

Internal distribution to the team's registered iPhones on the `staging` channel. Never `--profile production`, never `eas submit`, never TestFlight (FR-001, D2). The change is JS-only, so `app.json` `expo.version` and `native-fingerprint.json` stay as they are.
