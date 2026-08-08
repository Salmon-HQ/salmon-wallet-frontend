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
| `source/` | raw, unframed captures (Maestro / Playwright output) before any framing | — | `android-staged/`, `ios-staged/`, `web-staged/` |

Two icons, two behaviors, easy to mix up:

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
