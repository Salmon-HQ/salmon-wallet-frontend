# Quickstart: verifying Mobile on Expo SDK 57

How to prove the upgrade works, locally. Run from the repo root on Node 24
(`nvm use`). Never type a real seed into an emulator: use the public BIP-39
test phrase for derivation checks and the devnet test wallet for sends.

## Prerequisites

- Node 24.21.0, pnpm 9, JDK 17, Android SDK with platform 36.
- Android emulators: one with gesture navigation, one with 3-button
  navigation (`cmd overlay enable-exclusive --category
com.android.internal.systemui.navbar.threebutton`).
- iOS: Xcode ≥ 26.4 and an iOS 16.4+ simulator.
- Backend running locally (`docker compose up` in `salmon-wallet-backend`)
  with `adb reverse tcp:3001 tcp:3001` and `adb reverse tcp:8081 tcp:8081`.

## 1. Repo gates (every checkpoint)

```bash
pnpm install --frozen-lockfile
pnpm format:check && pnpm check:no-secrets
pnpm turbo run typecheck lint test:coverage --force
pnpm --filter @salmon/extension build && pnpm check:manifest
pnpm check:powerups-bundle apps/extension/dist/chrome-mv3
pnpm --filter @salmon/mobile export:check
pnpm check:fingerprint && node scripts/check-i18n.mjs
pnpm check:parity:test && pnpm check:parity
cd apps/mobile && npx expo-doctor@latest
```

Expected: all green, `expo-doctor` without dependency or config errors.

## 2. Build and launch

```bash
cd apps/mobile
rm -rf ios android                  # CNG: regenerate for the new SDK
npx expo run:android --device <emulator>
npx expo run:ios --device <simulator>   # once Xcode ≥ 26.4
```

Expected: the build compiles (this is the proof for research R1: the seed
accelerator links on the new React Native), the app opens to onboarding.

## 3. Derivation invariant (SC-001)

Recover the public test phrase on the SDK 55 build and on the new build and
compare the first three addresses per chain. They must be identical. Time the
recovery on the Android emulator on both builds (SC-002, ≤ +10%). Confirm
the native accelerator path ran (no fallback warning in Metro's log).

## 4. Update-in-place (User Story 1)

Install the SDK 55 build, create a wallet, set biometrics; install the new
build over it without uninstalling. Unlock with password, then biometrics;
enter a wrong password until the throttle engages. Same behaviour as before.

## 5. Device walk (User Stories 3 and 4)

On devnet, on each emulator/simulator:

- create wallet, recover wallet
- send SOL, send a token, scan a Solana Pay QR (camera), review, send
- activity shows each send; receive detection updates the balance
- NFTs: send and burn an NFT, a pNFT and a cNFT
- Powerups catalog, install/uninstall, the Payments tab
- sheets, keyboard screens (amount, password, recover), wait screen, lock
  overlay: nothing under the system bars, no single-frame flash

The existing Maestro flows in `apps/mobile/.maestro` cover onboarding and
recovery; run them with `./run.sh` against each emulator.

## 6. Memory (SC-006)

After unlock, idle on Home for 30 s, read `adb shell dumpsys meminfo
io.salmonwallet.app` TOTAL PSS on the SDK 55 and the new build. New ≤ old

- 10%.
