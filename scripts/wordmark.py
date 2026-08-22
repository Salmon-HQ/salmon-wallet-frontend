#!/usr/bin/env python3
"""Generates the Salmon wordmark from the product's own typeface.

The wordmark is not artwork someone drew: it is the word "Salmon" set in the
interface font and converted to outlines, so the logotype and the app can never
be set in two different faces. Because it is generated, changing the typeface
later is a re-run rather than a redraw — which is the whole reason this script
is committed instead of only its output.

Nothing here traces or approximates: HarfBuzz shapes the string (so kerning is
the font's own), and fontTools reads the glyph contours directly.

Output is `packages/shared/src/theme/wordmark.generated.ts`. Do not hand-edit
that file — hand edits are exactly what a future typeface change would silently
throw away. If the wordmark ever needs optical corrections that the font does
not give, they belong here as parameters, not as edits to the result.

    python3 scripts/wordmark.py                 # regenerate with the defaults
    python3 scripts/wordmark.py --text Salmon --track -0.01

Requires: fonttools, uharfbuzz.
"""
import argparse
import io
from pathlib import Path

import uharfbuzz as hb
from fontTools.misc.transform import Transform
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_FONT = ROOT / "packages" / "assets" / "src" / "fonts" / "DMSans-SemiBold.ttf"
OUT = ROOT / "packages" / "shared" / "src" / "theme" / "wordmark.generated.ts"

# DM Sans SemiBold is weight 600 — the weight DESIGN.md specifies for the
# wordmark, and the weight this system gives every named, deliberate piece of
# chrome (headline, title, button, label). It is not the 700 of the balance
# figure: the wordmark sits in the welcome screen's title slot, not in the
# display role, and 700 was only ever this script's argparse default.
DEFAULT_TEXT = "Salmon"
DEFAULT_TRACK = 0.0


def outlines(font_path: Path, text: str, track_em: float):
    """Shapes `text` and returns (paths, width, ascent, descent) in font units."""
    tt = TTFont(font_path)
    upm = tt["head"].unitsPerEm

    buffer_io = io.BytesIO()
    tt.save(buffer_io)
    face = hb.Face(buffer_io.getvalue())
    hb_font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf)

    glyphs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    track = track_em * upm

    paths: list[str] = []
    x = 0.0
    y_min, y_max = 0, 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        pen = SVGPathPen(glyphs)
        # Explicit matrix: x' = x + offset, y' = -y. Both the glyph's position
        # in the word and the font-space-to-SVG y flip are baked into the path
        # itself, so no transform attribute has to behave identically across
        # the DOM, react-native-svg and whatever renders the store artwork.
        flip_and_place = Transform(1, 0, 0, -1, x + pos.x_offset, 0)
        glyphs[name].draw(TransformPen(pen, flip_and_place))
        commands = pen.getCommands()
        if commands:
            paths.append(commands)
            glyph = tt["glyf"][name]
            if glyph.numberOfContours:
                y_min = min(y_min, glyph.yMin)
                y_max = max(y_max, glyph.yMax)
        x += pos.x_advance + track

    return paths, x - track, y_max, y_min


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--font", type=Path, default=DEFAULT_FONT)
    parser.add_argument("--text", default=DEFAULT_TEXT)
    parser.add_argument("--track", type=float, default=DEFAULT_TRACK,
                        help="letter tracking in em; 0 keeps the font's own fit")
    parser.add_argument("-o", "--out", type=Path, default=OUT)
    args = parser.parse_args()

    paths, width, y_max, y_min = outlines(args.font, args.text, args.track)
    height = y_max - y_min
    font_name = args.font.stem

    body = "\n".join(f"  '{path}'," for path in paths)
    args.out.write_text(
        f'''/**
 * GENERATED FILE — do not edit by hand.
 *
 * The word "{args.text}" set in {font_name} and converted to outlines by
 * `scripts/wordmark.py`. Regenerate with:
 *
 *     python3 scripts/wordmark.py
 *
 * Hand edits are lost on the next run, and a typeface change is a re-run.
 */

/** Native artboard of the generated wordmark, in font units. */
export const wordmarkViewBox = {{ width: {width:.0f}, height: {height:.0f} }} as const;

/** `viewBox` these paths are drawn against. The y origin is the cap top. */
export const wordmarkViewBoxAttr = '0 {-y_max:.0f} {width:.0f} {height:.0f}';

/** The word this wordmark spells. */
export const wordmarkText = '{args.text}';

/** The typeface the outlines came from. */
export const wordmarkTypeface = '{font_name}';

/**
 * One path per glyph, already flipped into SVG space (y down) and positioned
 * within the word. Draw them as-is against {{@link wordmarkViewBoxAttr}}.
 */
export const wordmarkPaths = [
{body}
] as const;
'''
    )
    print(f"{args.out.relative_to(ROOT)}  {args.text!r} in {font_name}  "
          f"{len(paths)} glyphs  {width:.0f}x{height:.0f}")


if __name__ == "__main__":
    main()
