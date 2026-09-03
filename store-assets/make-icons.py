#!/usr/bin/env python3
"""Renders every application and store icon from the vector master.

The master is `packages/shared/src/theme/brand.ts` — the same three path
strings the apps draw at runtime. Nothing here traces, upscales, or resamples
a bitmap: each target is rendered by rsvg-convert at its own native pixel
size, so the 16px icon is a 16px render of the curves and not a 512px icon
squeezed down. That is the whole point of the file.

    python3 store-assets/make-icons.py            # every target
    python3 store-assets/make-icons.py extension  # one group
    python3 store-assets/make-icons.py measure    # re-derive the ink bounds

Groups: extension, store.

Alpha is decided per target, because the stores disagree with each other:
Play's feature graphic forbids it, Play's 512 icon requires the container to
carry it, and the Chrome Web Store only applies its own rounded frame to a
listing icon that *lacks* it. Every entry cites the rule it meets.
"""
import io
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
HERE = Path(__file__).resolve().parent
BRAND_TS = ROOT / "packages/shared/src/theme/brand.ts"

# Coral tile gradient — the same two stops as `compose.py` (CORAL_TOP /
# CORAL_BOT). The bottom stop is salmon-500
# `#FF5C45` from packages/shared/src/theme/palette.ts.
CORAL_TOP, CORAL_BOT = (0xFF, 0x81, 0x70), (0xFF, 0x5C, 0x45)
# The mark's ink: `#FCFCFC`, not pure white. DESIGN.md — "Deep water has no
# pure white in it."
INK = "#FCFCFC"

# The mark occupies this fraction of its tile everywhere it is drawn large
# enough to be drawn faithfully. Matches the shipped artwork and favicon.svg
# ("scaled to 71% width").
BRAND_SCALE = 0.71


def mark_paths() -> list[str]:
    """The three path strings, read out of brand.ts so they cannot drift."""
    paths = re.findall(r"^\s*'(M[^']+)',\s*$", BRAND_TS.read_text(), re.M)
    if len(paths) != 3:
        raise SystemExit(f"expected 3 paths in {BRAND_TS}, found {len(paths)}")
    return paths


PATHS = mark_paths()
BODY = PATHS[:1]  # body with both eyes as counters; fins excluded

# Tight bounds of the ink, measured by rendering at 10x and reading the alpha
# bbox (`make-icons.py measure`). The authored viewBox is 253x237 but the ink
# does not fill it, and centring on the viewBox rather than on the ink leaves
# the mark visibly off-centre in the tile.
VB_FULL = (0.3, 0.0, 252.4, 237.0)   # all three paths
VB_BODY = (35.4, 0.0, 182.2, 237.0)  # body alone


def render_mark(paths, viewbox, w, h) -> Image.Image:
    """Rasterize `paths` at exactly w x h. No intermediate size, ever."""
    body = "".join(f'<path fill="{INK}" d="{d}"/>' for d in paths)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="{viewbox[0]} {viewbox[1]} {viewbox[2]} {viewbox[3]}">{body}</svg>'
    )
    out = subprocess.run(
        ["rsvg-convert", "-f", "png"], input=svg.encode(), capture_output=True
    )
    if out.returncode != 0:
        raise SystemExit(f"rsvg-convert failed: {out.stderr.decode()[:200]}")
    return Image.open(io.BytesIO(out.stdout)).convert("RGBA")


def gradient(size) -> Image.Image:
    """Vertical coral gradient, drawn at native size rather than scaled."""
    w, h = size
    im = Image.new("RGBA", size)
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / (h - 1) if h > 1 else 0.0
        c = tuple(round(CORAL_TOP[i] + (CORAL_BOT[i] - CORAL_TOP[i]) * t) for i in range(3))
        d.line([(0, y), (w, y)], fill=c + (255,))
    return im


def tile(size, *, pad=0, radius=0, scale=BRAND_SCALE, paths=None,
         viewbox=VB_FULL, fit="width", gamma=1.0) -> Image.Image:
    """One square icon: coral tile, optional inset and rounding, mark centred.

    `pad` insets the artwork and leaves transparent margin (the Chrome Web
    Store listing convention). `radius` rounds the tile itself. `scale` is the
    mark's size as a fraction of the *tile*, not of the whole canvas.
    """
    paths = paths or PATHS
    art = size - pad * 2
    base = gradient((art, art))

    if radius:
        mask = Image.new("L", (art, art), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, art - 1, art - 1], radius=radius, fill=255
        )
        base.putalpha(mask)

    if fit == "height":
        mh = max(1, round(art * scale))
        mw = max(1, round(mh * viewbox[2] / viewbox[3]))
    else:
        mw = max(1, round(art * scale))
        mh = max(1, round(mw * viewbox[3] / viewbox[2]))

    mark = render_mark(paths, viewbox, mw, mh)
    if gamma != 1.0:
        # Reshapes only the antialiasing ramp; the curves are untouched. Above
        # 1.0 it pulls partial-coverage pixels down, which at 16px is what
        # keeps the two eye counters from silting up into one bar.
        a = mark.getchannel("A").point(lambda v: round(255 * ((v / 255) ** gamma)))
        mark.putalpha(a)
    base.alpha_composite(mark, ((art - mw) // 2, (art - mh) // 2))

    if pad:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        canvas.alpha_composite(base, (pad, pad))
        return canvas
    return base


# --- the 16px case ---------------------------------------------------------
# At 16px the tile is 16 device pixels and the mark would be 11. The two fins
# land on ~2px each and read as detached specks flanking the body, while the
# eye counters fall below 1.5px and silt up into pale smudges — which is the
# blob the old naive downscale produced. So 16px drops the fins and promotes
# the body: same path data from brand.ts, no geometry edited, just the subset
# that survives, scaled up to claim the room the fins were wasting. The eyes
# are the thing that makes the mark read as a fish rather than a white lozenge,
# so they get the pixels. gamma>1 thins the antialiasing ramp to hold the gap
# between the two eyes open.
PX16 = dict(paths=BODY, viewbox=VB_BODY, scale=0.90, fit="height", gamma=1.25)
# At 32px the fins do survive, but only just — they need more mass than the
# 71% brand scale gives them, so the whole mark comes up to 78%.
PX32 = dict(scale=0.78)

# Maskable (PWA / Android adaptive) icons are cropped by a mask the platform
# chooses. Android's adaptive-icon contract guarantees only the central 66.7%
# (72dp of a 108dp viewport). The mark's bounding box has to fit inside that
# circle, so scale <= 0.667 / sqrt(1 + 1/aspect^2) ~= 0.48. Inside the visible
# circle that still reads as the usual ~71% proportion.
MASKABLE = dict(scale=0.48)

EXT = ROOT / "apps/extension/public"

# (path, size, kwargs, alpha, note)
TARGETS = {
    "extension": [
        # Chrome: manifest 128 is also the Web Store listing icon ("You must
        # provide a 128x128-pixel extension icon image in the ZIP file of your
        # extension"), so it follows the store rule: 96x96 of art with 16px of
        # transparent padding per side. Because it *has* alpha the store will
        # not draw its own 12px frame, so the rounding is baked here at the
        # same 12/128 ratio the store would have used (9px on a 96px tile).
        # https://developer.chrome.com/docs/webstore/images
        (EXT / "icon-128.png", 128, dict(pad=16, radius=9), True,
         "CWS listing icon: 96px art + 16px transparent pad, rounding baked"),
        # Toolbar and management-page sizes stay full-bleed: padding here just
        # shrinks the mark on the one surface where it is already smallest.
        # Alpha allowed, not required — PNG carries it for consistency.
        # https://developer.chrome.com/docs/extensions/reference/manifest/icons
        (EXT / "icon-16.png", 16, PX16, True, "toolbar/favicon, 16 DIP"),
        (EXT / "icon-32.png", 32, PX32, True, "toolbar @2x"),
        (EXT / "icon-48.png", 48, {}, True, "chrome://extensions"),
        # Firefox recommends 32 + 64 for the add-ons manager.
        # https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/icons
        (EXT / "icon-64.png", 64, {}, True, "Firefox add-ons manager @2x"),
        # WXT discovers every `public/icon-<n>.png` and writes it into the
        # generated manifest's `icons` block, so a file landing here is enough
        # to declare it — wxt.config.ts needs no edit. Verify with
        # `pnpm --filter @salmon/extension build` then read
        # `apps/extension/dist/chrome-mv3/manifest.json`.
        (EXT / "icon-192.png", 192, {}, True, "manifest icons (WXT auto-discovered)"),
        (EXT / "icon-512.png", 512, {}, True, "manifest icons (WXT auto-discovered)"),
    ],
    "store": [
        # Same rule and same bytes as the manifest icon above; the store folder
        # keeps a copy so the upload is not archaeology.
        (HERE / "chrome-web-store/store-icon-128.png", 128, dict(pad=16, radius=9), True,
         "CWS listing icon: 96px art + 16px transparent pad, rounding baked"),
        # Play: "32-bit PNG (with alpha)", full square, opaque artwork — Play
        # applies its own 30% mask and shadow, so no rounding is baked in.
        # https://support.google.com/googleplay/android-developer/answer/9866151
        # https://developer.android.com/google-play/resources/icon-design-specifications
        (HERE / "play/icon-512.png", 512, {}, True,
         "Play app icon: 32-bit PNG, opaque full square, Play masks it"),
    ],
}


def save(im: Image.Image, path: Path, *, alpha: bool):
    """Write the PNG at the colour type the destination requires."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if alpha:
        im.convert("RGBA").save(path, "PNG")
    else:
        # Flatten onto the tile's own bottom stop so an antialiased edge keeps
        # its intended colour instead of picking up a stray white or black.
        flat = Image.new("RGB", im.size, CORAL_BOT)
        flat.paste(im.convert("RGB"), (0, 0), im.getchannel("A"))
        flat.save(path, "PNG")


def build_feature_graphic():
    """Play feature graphic: strip the alpha channel it must not have.

    Play requires "JPEG or 24-bit PNG (no alpha)" for this slot, and the file
    shipped as 32-bit RGBA — which is the defect. It cannot simply be
    flattened, though: its rightmost column is fully transparent *and* black,
    so a naive composite bakes a 1px black stripe down the right edge. That
    column is repaired from its neighbour first. Every other pixel is alpha
    254 or 255, so dropping the channel is otherwise lossless — the RGB values
    are straight, not premultiplied.
    """
    src = HERE / "play/feature-graphic.png"
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    repaired = 0
    for x in range(w):
        if all(px[x, y][3] == 0 for y in range(h)):
            good = x - 1 if x > 0 else x + 1
            for y in range(h):
                px[x, y] = px[good, y]
            repaired += 1
    flat = im.convert("RGB")
    flat.save(src, "PNG")
    print(f"  feature-graphic.png  1024x500  RGB (24-bit, no alpha)"
          f"  [repaired {repaired} dead column(s)]")


def _measure():
    """Re-derive VB_FULL / VB_BODY from the paths. Run after a brand.ts edit."""
    for name, ps in [("VB_FULL", PATHS), ("VB_BODY", BODY)]:
        im = render_mark(ps, (0, 0, 253, 237), 2530, 2370)
        x0, y0, x1, y1 = (v / 10 for v in im.getchannel("A").getbbox())
        # printed as a viewBox — (min-x, min-y, width, height), not corners
        print(f"{name} = {(round(x0, 1), round(y0, 1), round(x1 - x0, 1), round(y1 - y0, 1))}")


def build(groups):
    for group in groups or TARGETS:
        print(f"{group}:")
        for path, size, kw, alpha, note in TARGETS[group]:
            save(tile(size, **kw), path, alpha=alpha)
            kind = "RGBA" if alpha else "RGB"
            print(f"  {path.relative_to(ROOT)}  {size}x{size}  {kind}  — {note}")
        if group == "store":
            build_feature_graphic()


if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["measure"]:
        _measure()
    else:
        build(args)
