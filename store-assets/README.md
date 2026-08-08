# store-assets

One folder per marketplace, holding exactly what each store's console asks for.
Sizes cited from the official specs (Chrome Web Store images doc, Play Console
asset specs, Apple screenshot specs 2025+, AMO listing guide).

| Store | What goes here | Required | Status |
|---|---|---|---|
| `play/` | `feature-graphic.png` 1024×500 (required), `icon-512.png` 512×512 32-bit with alpha (required), `phone/` 2–8 screenshots 9:16 (1080×1920 ✓), `listing.txt` copy | yes | **complete** |
| `app-store/iphone-6.9/` | 1290×2796 or 1320×2868 portrait screenshots (the required tier since 2025) | yes, before first submission | **complete** — 9 frames at 1320×2868, captured via Maestro on an iPhone 16 Pro Max simulator |
| `chrome-web-store/` | `screenshots/` 1280×800 (min 1, up to 5), `store-icon-128.png` (96×96 art in 128 canvas ✓), `promo-small-440x280.png` (required — listings without it rank below listings that have one) | yes | **complete** — 5 screenshots captured with the Playwright harness at a 1280×800 viewport |
| `amo/screenshots/` | 1280×800 recommended (1.6:1) | recommended | empty — can reuse the CWS captures, but prefer un-captioned crops: AMO advises against text on the image |
| `play/tablet-7/` · `play/tablet-10/` | 4–8 screenshots each, 1,080–7,680px, 9:16 or 16:9 | no, but see below | **missing** — never captured |
| `source/` | raw, unframed captures (Maestro / Playwright output) before any framing | — | `android-staged/`, `ios-staged/`, `web-staged/` |

## Tablets: deliberately deferred (2026-08-07)

**Decision:** the tablet slots stay empty until the app has an adaptive layout. Reason
below — screenshots alone do not earn the large-screen ranking benefit, because that
benefit is tied to the app meeting the large-screen quality guidelines, and this app is
`android:screenOrientation="portrait"` with zero breakpoints. Capturing now would produce a
stretched phone UI and buy nothing. Revisit after the adaptive-layout work, not before.


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
2. **The staged portfolio has to match the phone deck.** The mock server that staged it is
   not in this repo (see `apps/mobile/.maestro/` and the commit that added the capture
   flows). Captured against the live API, walletA shows whatever it holds that day — and a
   listing whose phone screenshots read $4,307.89 while its tablet screenshots read $0.00
   looks broken.

## Two icons, two behaviors, easy to mix up

- `play/icon-512.png` is full-bleed with square edges — Play rounds it itself when
  it renders the listing.
- `chrome-web-store/store-icon-128.png` carries an alpha channel, and the Chrome
  Web Store only applies its 12px rounded frame to images *without* alpha. So the
  rounding has to be baked into the artwork there.

Neither is the launcher icon: that one is compiled into the app (`apps/mobile`
adaptive icon, `apps/extension` manifest icons). Stores do not derive the listing
icon from the binary — it is uploaded by hand alongside the screenshots.

Framing/captions (optional, when wanted): `npx appshots frame <dir> --device <preset> --out <dir>` —
validates store dimensions too (`npx appshots validate <dir>`). Capture stays on
Maestro (mobile) and Playwright (extension/web); do not add fastlane for this.
