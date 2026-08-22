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
2. **The staged portfolio has to match the phone deck.** The mock server that staged it is
   not in this repo (see `apps/mobile/.maestro/` and the commit that added the capture
   flows). Captured against the live API, walletA shows whatever it holds that day — and a
   listing whose phone screenshots read $4,307.89 while its tablet screenshots read $0.00
   looks broken.

## Icons are generated, not drawn — `make-icons.py`

Every application and store icon is rendered from the vector master
(`packages/shared/src/theme/brand.ts`, the same three paths the apps draw at
runtime) by `python3 store-assets/make-icons.py`. Each target is rasterized by
`rsvg-convert` at its own native pixel size; nothing is produced by shrinking a
larger PNG. Edit the table in that script, re-run it, and commit the output —
do not retouch the PNGs by hand, or the next run silently reverts the retouch.

    python3 store-assets/make-icons.py            # every target
    python3 store-assets/make-icons.py extension  # extension | web | store

It owns `apps/extension/public/icon-*.png`, `apps/web/public/` icons, both
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
Maestro (mobile) and Playwright (extension/web); do not add fastlane for this.
