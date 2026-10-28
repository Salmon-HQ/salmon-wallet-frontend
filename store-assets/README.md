# store-assets

One folder per marketplace, holding exactly what each store's console asks for.
Sizes cited from the official specs (Chrome Web Store images doc, Play Console
asset specs, Apple screenshot specs 2025+, AMO listing guide).

| Store | What goes here | Required | Status |
|---|---|---|---|
| `app-store/iphone-6.9/` | 1320×2868 portrait screenshots; App Store Connect scales them to the required "iPhone with Dynamic Island (medium)" class | yes | 6 frames for 1.4.0: Home, Swap review, Powerups catalogue, Payments QR, Send review, NFTs |
| `app-store/iphone-6.9-uk/` | the English (U.K.) localisation's set | yes, for the U.K. listing | the same deck with no Swap anywhere: token detail replaces the Swap frame, and the catalogue is the one captured with Swap switched off for the region |
| `app-store/header-3840x1646.png` | product page header (creative asset, guideline 2.3.14) | no | from `SOT/03-dev/Design System/Store Graphics.pen` |
| `play/` | `feature-graphic.png` 1024×500, `icon-512.png`, `phone/` 2–8 screenshots | yes | feature graphic from `Store Graphics.pen`; `phone/` is the App Store deck on Android |
| `play/phone-uk/` | the United Kingdom custom store listing's set | yes, for the U.K. listing | the phone deck with no Swap anywhere: token detail replaces the Swap frame, and the catalogue frame is left out because no Android capture has Swap switched off; the U.K. listing's tablet slots take these frames too |
| `play/tablet-7/` · `play/tablet-10/` | 4–8 screenshots each, 1,080–7,680px | no, see below | no folder of their own: upload the `play/phone/` frames to both slots |
| `dapp-store/` | `screenshots/` 4–8 of one size, `banner-1200x600.png`, `icon-512.png` (opaque) | yes | banner from `Store Graphics.pen`; screenshots show the Seeker features (Seed Vault, Mobile Wallet Adapter, SKR) |
| `chrome-web-store/` | `screenshots/` 1280×800 (up to 5), `store-icon-128.png`, `promo-small-440x280.png` | yes (promo tile ranks the listing) | 5 frames from the side panel: Home, Swap review, Powerups, a dApp message to sign, Send review; promo tile from `Store Graphics.pen` |
| `amo/screenshots/` | 1280×800 | recommended | empty: the extension never shipped on Firefox |
| `source/` | raw captures, never uploaded | — | `ios-staged/`, `android-staged/`, `seeker-staged/`, `extension-staged/` |

Captions live in `compose.py`'s decks. They count as listing metadata: no "exchange", "trade" or "order", no prices or awards, and the U.K. deck never mentions Swap.

## Refreshing the decks

Every screenshot shows one fictional account (Apple 2.3.9): the same balances, history and NFTs on every platform. `staging/proxy.mjs` stands in front of the production API, answers the staged wallets' balance, history, stakes, NFTs and SKR position from `staging/staged.mjs`, and passes everything else through, so prices, charts and the Swap quote are real. Pass-through answers are recorded in `staging/cache/` and replayed, so a deck shot today and one shot next week show the same figures; delete the cache to record fresh prices. The NFTs are Salmon's own art (`staging/make-nft-art.py`), served from this repository over https because the app loads NFT media over https only.

1. `store-assets/staging/run.sh` starts the proxy on port 3900 (`STAGING_REGION=uk` switches Swap off for the U.K. catalogue, `STAGING_REGION=seeker` adds the SKR stake for the dApp Store deck). At start it prints a check: the staged total, any token without a logo, the mode, and whether a live Swap quote simulates.
2. iOS: build a Release app pointed at it, `EXPO_PUBLIC_SALMON_ENV=production EXPO_PUBLIC_API_URL=http://localhost:3900 npx expo run:ios --configuration Release --device <udid> --no-bundler`, then from `apps/mobile/.maestro`: `SALMON_API_URL=http://localhost:3900 ./run.sh --release --device <udid> --test-output-dir=<dir> -e OUT=ios flows/store/capture.yaml` and `flows/store/capture-uk.yaml` (with the U.K. proxy). Maestro 2.11 writes screenshots only inside `--test-output-dir`; copy them into `source/ios-staged/`.
3. Android: a debug build (a release build refuses plain http to the proxy) with Metro started with the same `EXPO_PUBLIC_*` values; the same flows with `--device emulator-5554`. Play's emulator must not run Seed Vault, or the catalogue offers SKR. The dApp Store deck runs `flows/store/capture-seeker.yaml` and `capture-seeker-mwa.yaml` on a Seeker emulator set up as in the Maestro README's "Seeker emulator" section, with the proxy in `seeker` mode. `capture-seeker-mwa.yaml` takes `-e DAPP_URL=https://www.salmonwallet.io/dapp-demo.html`: the dApp has to be served over https so the frames show a real address instead of `localhost`. Its source is `staging/dapp-demo.html`; it goes on the website (`public/dapp-demo.html`) only while capturing. Store captures skip `run.sh`'s devnet fixtures, so they need no backend checkout.
4. Extension: `VITE_API_URL=http://127.0.0.1:3900 pnpm build` in `apps/extension`, then `node .playwright/scripts/store-shots.mjs`.
5. `python3 store-assets/compose.py` frames every deck; it clears each output folder first, so no stale frame survives.

The Swap frame quotes 0.01 SOL: the backend quotes only amounts the demo wallet really holds, so the quote is live while the balance on screen is staged. When the proxy's check says Swap fails, the router is having a bad moment: shoot the rest and retake the Swap frame alone with `flows/store/capture-swap.yaml`. Nothing in the flows signs: Swap stops on its review, the dApp request is closed unanswered.

## Tablets: deliberately deferred (2026-08-07)

**Decision:** no tablet *captures* until the app has an adaptive layout. The 7-inch and
10-inch slots on Play are filled with the phone frames from `play/phone/` as a stopgap —
they are 1080x1920, which satisfies the tablet spec (1,080–7,680px, 9:16), and tablet
traffic for this app is close to zero, so a slot showing how the app looks on a phone beats
an empty one.

What that stopgap does *not* buy: the large-screen ranking benefit, which Play ties to the
app meeting the large-screen quality guidelines, not to the listing carrying images. This
app is `android:screenOrientation="portrait"` with zero breakpoints, so capturing on a
tablet today would only show a stretched phone layout. Revisit after the adaptive-layout
work, not before.


Play exposes **7-inch and 10-inch tablet screenshot slots separately from phone**, and this
listing has never filled them. Nothing blocks publishing — which is exactly why it went
unnoticed. The cost is on the ranking side:

> "Apps and games that adhere to our large screen app quality guidelines will now be ranked
> higher in search and Apps and Games Home."
> — <https://android-developers.googleblog.com/2023/07/introducing-new-play-store-for-large-screens.html>

Play also shows large-screen users a warning on the listing of an app that is not optimized
for their device.

Spec, from <https://support.google.com/googleplay/android-developer/answer/9866151>:
minimum 4 screenshots per tablet type, up to 8, between **1,080 and 7,680px**, **9:16**
portrait or **16:9** landscape.

Two things to settle before capturing (the deck cannot just be re-rendered at a tablet
canvas — that would be the phone UI blown up):

1. **Does the app actually have a distinct tablet layout?** If it only scales the phone
   layout, tablet screenshots add little beyond filling the slot, and that is a finding to
   report rather than paper over.
2. **The staged portfolio has to match the phone deck.** Capture through `staging/proxy.mjs`
   like every other deck, so the tablet frames show the same account as the phone frames.

## Icons are generated, not drawn — `make-icons.py`

Every application and store icon is rendered from the vector master
(`packages/shared/src/theme/brand.ts`, the same three paths the apps draw at
runtime) by `python3 store-assets/make-icons.py`. Each target is rasterized by
`rsvg-convert` at its own native pixel size; nothing is produced by shrinking a
larger PNG. Edit the table in that script, re-run it, and commit the output —
do not retouch the PNGs by hand, or the next run silently reverts the retouch.

    python3 store-assets/make-icons.py            # every target
    python3 store-assets/make-icons.py extension  # extension | store

It owns `apps/extension/public/icon-*.png`, both
128 store icons, and `play/icon-512.png`, and it strips the alpha from
`play/feature-graphic.png`. It does **not** own the screenshots — those stay
with `compose.py`.

**16px is deliberately not the same artwork.** At 16 the fins land on ~2px and
the eye counters fall under 1.5px, so a faithful reduction is a pale blob. The
16px icon therefore draws only the body path (eyes included, as counters) and
scales it up into the room the fins were wasting. Same path data, no geometry
edited — see the `PX16` note in the script.

## Two icons, two behaviors, easy to mix up

- `play/icon-512.png` is full-bleed with square edges and fully opaque, inside a
  32-bit (alpha-bearing) PNG — Play requires that container, applies its own 30%
  rounding mask and shadow, and warns that transparency shows through as Play's
  own UI background.
  <https://developer.android.com/google-play/resources/icon-design-specifications>
- `chrome-web-store/store-icon-128.png` is 96×96 of art with 16px of transparent
  padding per side, which is the store's published rule. Because it *has* alpha
  the store will not draw its own 12px frame ("If you upload an image that has no
  alpha, it will be placed in a frame with rounded corners"), so the rounding is
  baked into the artwork at the same 12/128 ratio.
  <https://developer.chrome.com/docs/webstore/images>

The Chrome one is **not** a separate upload: the Web Store takes the listing icon
from the 128 inside the extension ZIP ("You must provide a 128x128-pixel
extension icon image in the ZIP file of your extension"), so
`chrome-web-store/store-icon-128.png` is a byte-identical copy of
`apps/extension/public/icon-128.png` kept here for reference. Play and the App
Store *are* uploaded by hand alongside the screenshots.

Framing/captions (optional, when wanted): `npx appshots frame <dir> --device <preset> --out <dir>` —
validates store dimensions too (`npx appshots validate <dir>`). Capture stays on
Maestro (mobile) and Playwright (extension); do not add fastlane for this.
