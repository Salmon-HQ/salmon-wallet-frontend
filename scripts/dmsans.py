#!/usr/bin/env python3
"""Builds the four shipped DM Sans statics, with tabular digit advances.

Why this script exists
----------------------
DM Sans has no `tnum` feature and no tabular figures in any released version
(googlefonts/dm-fonts#25 is open and unanswered since 2023). Its digits are
proportional by a wide margin — at weight 400 the `1` is 342 units against the
`0` at 656 — so a balance ticking from `$17.29` to `$17.30` reflows the line on
every price refresh. That is the single most-watched number in a wallet.

`font-variant-numeric: tabular-nums` and React Native's
`fontVariant: ['tabular-nums']` are both requests to the *font* to activate
`tnum`. With no such feature they are silently ignored — no error, no fallback,
no fix. So the fix has to live in the binary.

This script instantiates the upstream variable font at the four weights the
design system uses and equalises the ten digit advances: every digit is widened
to the widest one and its outline is shifted by half the difference, so the
glyph stays optically centred in its new advance. The result is tabular
*unconditionally* — there is no feature to switch on, which means it behaves
identically on web, extension and React Native, and cannot be forgotten at a
call site.

Licence
-------
DM Sans is SIL OFL 1.1 and declares **no Reserved Font Name** — its notice is
`Copyright 2014 The DM Sans Project Authors` with no "with Reserved Font Name"
clause — so OFL clause 3 does not bind and a modified binary may keep the name.
The obligations that do bind are met here: the licence ships beside the binaries
(`DMSans-OFL.txt`, clause 2), the modified fonts stay OFL (clause 5), and no
author's name is used to promote them (clause 4). Each output is stamped in its
`name` table (IDs 5, 10) so the modification is visible to anyone who opens the
file and nobody later diffs it against upstream and finds an unexplained delta.

Provenance
----------
Source: `packages/assets/src/fonts/upstream/DMSans-4.004[opsz,wght].ttf`,
committed so this is reproducible offline, taken from
https://github.com/google/fonts/tree/main/ofl/dmsans (Version 4.004;
gftools[0.9.30]). Optical size is pinned at 9 — the axis default and its
small-text end, which is where this UI lives (10-24px for everything except the
one 60px balance).

    python3 scripts/dmsans.py            # rewrite the four statics
    python3 scripts/dmsans.py --check    # verify the shipped files, write nothing

`--check` is what the digit-advance test in @salmon/shared covers from the JS
side; this flag is here so the same claim can be re-verified from the source of
truth without a test runner.

Requires: fonttools, uharfbuzz.
"""
import argparse
import io
import shutil
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "packages" / "assets" / "src" / "fonts"
SOURCE = FONTS / "upstream" / "DMSans-4.004[opsz,wght].ttf"
# The two apps that serve fonts over HTTP keep their own copy under `public/`.
MIRRORS = (
    ROOT / "apps" / "web" / "public" / "fonts",
    ROOT / "apps" / "extension" / "public" / "fonts",
)

FAMILY = "DM Sans"
OPSZ = 9
# style name -> (weight class, output stem)
WEIGHTS = {
    "Regular": (400, "DMSans-Regular"),
    "Medium": (500, "DMSans-Medium"),
    "SemiBold": (600, "DMSans-SemiBold"),
    "Bold": (700, "DMSans-Bold"),
}
DIGITS = "0123456789"


def digit_advances(font: TTFont) -> dict[str, int]:
    """Advance width of each of the ten digits, keyed by the digit."""
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    return {d: hmtx[cmap[ord(d)]][0] for d in DIGITS}


def tabularise(font: TTFont) -> int:
    """Widen every digit to the widest, re-centring its outline. Returns the width."""
    cmap = font.getBestCmap()
    glyf, hmtx = font["glyf"], font["hmtx"]
    names = [cmap[ord(d)] for d in DIGITS]
    target = max(hmtx[n][0] for n in names)

    for name in names:
        advance, lsb = hmtx[name]
        delta = target - advance
        if delta == 0:
            continue
        glyph = glyf[name]
        if glyph.numberOfContours <= 0:
            # A composite or empty digit would need the shift applied to its
            # components instead; no DM Sans digit is one, so refuse rather
            # than silently ship a mis-spaced glyph.
            raise SystemExit(f"{name}: expected a simple glyph, got {glyph.numberOfContours}")
        shift = round(delta / 2)
        glyph.coordinates.translate((shift, 0))
        glyph.recalcBounds(glyf)
        hmtx[name] = (target, lsb + shift)

    return target


def unkern_digits(font: TTFont) -> int:
    """Drop every kern pair that touches a digit. Returns the number removed.

    Equal advances are only half of tabular. The `kern` pairs in GPOS were fitted
    to the original proportional shapes — `1,` was tuned against a 342-unit `1` —
    so after respacing they are both wrong and, worse, *conditional*: they make
    the line width depend on which digits are next to which separator, which is
    the jitter coming back through the other door (`$17.29` and `$17.30` measured
    0.36px apart in the browser, `1,234.56` and `9,999.99` 3.6px apart, with the
    advances already equalised). Real tabular figures are not kerned. Neither are
    these.
    """
    cmap = font.getBestCmap()
    digits = {cmap[ord(d)] for d in DIGITS}
    removed = 0

    for lookup in font["GPOS"].table.LookupList.Lookup:
        if lookup.LookupType != 2:  # pair positioning; nothing else moves digits
            continue
        for sub in lookup.SubTable:
            if sub.Format == 1:
                keep_first = [g not in digits for g in sub.Coverage.glyphs]
                for pair_set, keep in zip(sub.PairSet, keep_first):
                    if not keep:
                        removed += len(pair_set.PairValueRecord)
                        continue
                    survivors = [r for r in pair_set.PairValueRecord if r.SecondGlyph not in digits]
                    removed += len(pair_set.PairValueRecord) - len(survivors)
                    pair_set.PairValueRecord = survivors
                    pair_set.PairValueCount = len(survivors)
                sub.PairSet = [ps for ps, keep in zip(sub.PairSet, keep_first) if keep]
                sub.Coverage.glyphs = [g for g, keep in zip(sub.Coverage.glyphs, keep_first) if keep]
                sub.PairSetCount = len(sub.PairSet)
            elif sub.Format == 2:
                # Class-based. Dropping digits from the coverage kills them as the
                # first glyph of a pair; as the second they fall in class 0, whose
                # row must therefore be empty — assert rather than assume.
                for name, class_def in (("ClassDef1", sub.ClassDef1), ("ClassDef2", sub.ClassDef2)):
                    if any(class_def.classDefs.get(g, 0) for g in digits):
                        raise SystemExit(f"{name}: a digit carries a kern class; handle it explicitly")
                for rec in sub.Class1Record:
                    value = rec.Class2Record[0].Value1
                    if value is not None and getattr(value, "XAdvance", 0):
                        raise SystemExit("class 0 carries kerning; digits cannot be neutralised by class")
                before = len(sub.Coverage.glyphs)
                sub.Coverage.glyphs = [g for g in sub.Coverage.glyphs if g not in digits]
                removed += before - len(sub.Coverage.glyphs)

    return removed


def stamp(font: TTFont, style: str) -> None:
    """Rewrite the name table: correct family/style, and record the modification."""
    name = font["name"]
    upstream_version = name.getDebugName(5) or "Version 4.004"
    full = f"{FAMILY} {style}" if style != "Regular" else FAMILY
    postscript = f"{FAMILY.replace(' ', '')}-{style}"
    modified = (
        f"{upstream_version}; modified for Salmon Wallet by scripts/dmsans.py "
        f"(digit advances equalised and digit kern pairs dropped at {OPSZ}pt optical "
        f"size; outlines otherwise "
        f"untouched). SIL OFL 1.1, no Reserved Font Name."
    )
    for nid, value in (
        (1, FAMILY),
        (2, style),
        (4, full),
        (5, modified),
        (6, postscript),
        (10, modified),
        (16, FAMILY),
        (17, style),
    ):
        name.setName(value, nid, 3, 1, 0x409)
        name.setName(value, nid, 1, 0, 0)


def build(style: str) -> TTFont:
    weight, _ = WEIGHTS[style]
    font = instantiateVariableFont(TTFont(SOURCE), {"wght": weight, "opsz": OPSZ}, inplace=True)
    font["OS/2"].usWeightClass = weight
    tabularise(font)
    unkern_digits(font)
    stamp(font, style)
    return font


# Pairs that must shape to the same width. Each swaps digits only, so any
# difference is the font moving the line under a value that merely ticked.
JITTER_PAIRS = (("$17.29", "$17.30"), ("1,234.56", "9,999.99"), ("111111", "000000"))


def shaped_width(font: TTFont, text: str) -> int:
    """Advance of `text` as HarfBuzz shapes it — kerning and all."""
    buffer_io = io.BytesIO()
    font.save(buffer_io)
    hb_font = hb.Font(hb.Face(buffer_io.getvalue()))
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf)
    return sum(pos.x_advance for pos in buf.glyph_positions)


def check() -> int:
    """Assert the shipped binaries are tabular and the mirrors match. 0 if clean."""
    failures = 0
    for style, (_, stem) in WEIGHTS.items():
        path = FONTS / f"{stem}.ttf"
        if not path.exists():
            print(f"MISSING  {path.relative_to(ROOT)}")
            failures += 1
            continue
        font = TTFont(path)
        distinct = set(digit_advances(font).values())
        # Equal advances are necessary but not sufficient: a surviving kern pair
        # between a digit and a separator moves the line too. Shape the strings.
        jitters = [
            (a, b)
            for a, b in JITTER_PAIRS
            if shaped_width(font, a) != shaped_width(font, b)
        ]
        status = "ok" if len(distinct) == 1 and not jitters else "JITTERS"
        print(f"{status:8} {stem}.ttf  digits {sorted(distinct)}"
              + (f"  moves on {jitters}" if jitters else ""))
        failures += len(distinct) != 1 or bool(jitters)
        for mirror in MIRRORS:
            copy = mirror / f"{stem}.ttf"
            if not copy.exists() or copy.read_bytes() != path.read_bytes():
                print(f"STALE    {copy.relative_to(ROOT)}")
                failures += 1
    return failures


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="verify, write nothing")
    args = parser.parse_args()

    if args.check:
        sys.exit(check())

    for style, (_, stem) in WEIGHTS.items():
        font = build(style)
        out = FONTS / f"{stem}.ttf"
        font.save(out)
        for mirror in MIRRORS:
            shutil.copy2(out, mirror / f"{stem}.ttf")
        widths = sorted(set(digit_advances(TTFont(out)).values()))
        print(f"{out.relative_to(ROOT)}  {out.stat().st_size // 1024}KB  digits {widths}")


if __name__ == "__main__":
    main()
