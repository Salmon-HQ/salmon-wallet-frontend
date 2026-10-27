#!/usr/bin/env python3
"""Draws the staged collection, Salmon Run #1-4, from the Salmon mark.

The store screenshots show NFTs, and art someone else owns cannot appear in
them, so the staged wallet holds these instead. Same vector master and
renderer as the icons (`make-icons.py`).

    python3 store-assets/staging/make-nft-art.py
"""
import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("make_icons", HERE.parent / "make-icons.py")
icons = importlib.util.module_from_spec(spec)
spec.loader.exec_module(icons)

SIZE = 1024
# (gradient top, gradient bottom, mark colour) from packages/shared/src/theme/palette.ts
VARIANTS = [
    ((0xFF, 0x9E, 0x8B), (0xFF, 0x5C, 0x45), (0xFC, 0xFC, 0xFC)),  # salmon-300 → 500, ink
    ((0x16, 0x1C, 0x2D), (0x07, 0x09, 0x11), (0xFF, 0x5C, 0x45)),  # neutral-900 → 1000, salmon-500
    ((0x8F, 0x2B, 0x1E), (0x5C, 0x1B, 0x13), (0xFF, 0xBF, 0xB2)),  # salmon-800 → 900, salmon-200
    ((0xED, 0xF1, 0xF7), (0xC3, 0xCB, 0xDA), (0xE6, 0x4A, 0x34)),  # neutral-50 → 200, salmon-600
]


def art(top, bottom, ink):
    im = Image.new("RGB", (SIZE, SIZE))
    draw = ImageDraw.Draw(im)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        draw.line([(0, y), (SIZE, y)], fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    mw = round(SIZE * 0.6)
    mh = round(mw * icons.VB_FULL[3] / icons.VB_FULL[2])
    alpha = icons.render_mark(icons.PATHS, icons.VB_FULL, mw, mh).getchannel("A")
    im.paste(Image.new("RGB", (mw, mh), ink), ((SIZE - mw) // 2, (SIZE - mh) // 2), alpha)
    return im


out = HERE / "assets" / "nft"
out.mkdir(parents=True, exist_ok=True)
for n, (top, bottom, ink) in enumerate(VARIANTS, start=1):
    art(top, bottom, ink).save(out / f"salmon-run-{n}.png", optimize=True)
    print(f"salmon-run-{n}.png")
