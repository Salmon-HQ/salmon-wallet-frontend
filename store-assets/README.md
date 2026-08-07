# store-assets

One folder per marketplace, holding exactly what each store's console asks for.
Sizes cited from the official specs (Chrome Web Store images doc, Play Console
asset specs, Apple screenshot specs 2025+, AMO listing guide).

| Store | What goes here | Required | Status |
|---|---|---|---|
| `play/` | `feature-graphic.png` 1024×500 (required), `phone/` 2–8 screenshots 9:16 (1080×2400 ✓), `listing.txt` copy | yes | **complete** |
| `app-store/iphone-6.9/` | 1290×2796 or 1320×2868 portrait screenshots (the required tier since 2025) | yes, before first submission | empty — capture via Maestro on an iPhone 16 Pro Max simulator once the Apple team invite lands |
| `chrome-web-store/` | `screenshots/` 1280×800 (min 1, up to 5), `store-icon-128.png` (96×96 art in 128 canvas ✓), `promo-small-440x280.png` (optional) | screenshots required | **screenshots missing** — capture the popup/sidepanel with the existing Playwright harness at a 1280×800 viewport |
| `amo/screenshots/` | 1280×800 recommended (1.6:1) | recommended | can reuse the CWS captures |
| `source/` | raw, unframed captures (Maestro / Playwright output) before any framing | — | as needed |

Framing/captions (optional, when wanted): `npx appshots frame <dir> --device <preset> --out <dir>` —
validates store dimensions too (`npx appshots validate <dir>`). Capture stays on
Maestro (mobile) and Playwright (extension/web); do not add fastlane for this.
