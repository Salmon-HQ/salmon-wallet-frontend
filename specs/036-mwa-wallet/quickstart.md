# Quickstart: Mobile Wallet Adapter (spec 036)

## Run it

```bash
export PATH="$HOME/Library/Application Support/Herd/config/nvm/versions/node/v24.21.0/bin:$PATH"
cd apps/mobile
npx expo prebuild --platform android --clean --no-install   # native change: the plugin adds the dApp activity
set -a; . ./.env.staging; set +a
npx expo run:android --device Seeker_API35                  # Seeker-sized AVD: API 35, 1200x2670, 480 dpi
```

Check the plugin worked: `adb shell am start -W -a android.intent.action.VIEW -d 'solana-wallet:/v1/associate/local?association=x&port=1'` must resolve to `io.salmonwallet.app` instead of `unable to resolve Intent`.

## Hand-test

Set up or recover a wallet in Salmon and switch it to devnet, fund it from a devnet faucet.

1. `npx solana-mobile@latest playground` → the test page opens in the emulator's browser.
2. **Connect**: pick Salmon → approval over the page → approve → the page shows the address; Settings → Trusted apps lists it.
3. **Sign in**: connect with sign-in → one approval → page verifies the signature.
4. **Sign message**, **Sign transaction**, **Sign and send** → each approved; the send returns a signature visible on a devnet explorer.
5. **Decline** any of them → the page reports the user declined.
6. Revoke the app in Trusted apps → the next request asks to connect again.
7. Lock Salmon (background it) → a request asks to unlock first.

Also with `fakedapp.apk` (MWA repo releases): `adb install fakedapp-release.apk`.
