#!/usr/bin/env python3
"""Generates the myoseptal flesh texture that fills the product's salmon surfaces.

The texture is not a drawing someone made by hand: it is the level sets of a
field, evaluated and written out as SVG path data. Because it is generated,
retuning it later is a re-run with different numbers rather than a redraw —
which is the whole reason this script is committed instead of only its output.

The drawing model
-----------------
Band `k` is the curve

    x(y) = k*s + shear*y + amp*chevron(y) + warp(k*s + shear*y, y)

with `s = tile_width / bands` the band spacing, `chevron` an asymmetric W
periodic over the tile height, and `warp` a small sum of sines whose
frequencies are whole numbers in both axes.

Two properties follow from that construction, and both matter:

  * The bands run *across* the fillet, raked back off vertical, which is how
    myosepta actually sit in the fish (van Leeuwen, JEB 202:3405). Bands that
    run along the long axis read as wood grain, not as flesh.

  * The tile has no seam, by construction rather than by fading out at the
    edges. Vertically, choosing `shear*H = lean*s` for a whole number `lean`
    means the band leaving the bottom edge is exactly the band entering the
    top — same position AND same slope, because the warp is periodic in y and
    the chevron completes a whole number of cycles per tile. Horizontally,
    band `k + bands` is band `k` displaced by exactly one tile width, because
    the warp is periodic in x too.

    The along-band opacity envelope is sampled from that same periodic field,
    so a band's last stop equals its continuation's first stop by construction
    rather than by both being zero. Nothing is pinned to zero at a tile edge —
    pinning it there is what the previous texture did, and it is why that one showed an
    untextured column every tile: killing every envelope at the boundary does
    not hide a seam, it *is* the seam.

Hard constraints this generator cannot violate
----------------------------------------------
  * Every band is drawn in `salmon-50`, lighter than the `salmon-500` fill it
    sits on, so the texture can only ever raise the luminance under a label
    and never lower a label's contrast. `flesh.test.ts` asserts it.
  * No SVG filters. `react-native-svg` (checked at 15.15.3) stubs
    `FeTurbulence` and `FeDisplacementMap` out entirely, so all irregularity
    is authored into the path data and the soft edge is a stack of strokes
    rather than a blur.
  * Gradients on stroke only — those both platforms do implement natively.

Output is `packages/shared/src/theme/flesh.ts`. Do not hand-edit that file;
hand edits are lost on the next run, and a retune is a re-run.

    python3 scripts/flesh.py                      # the shipped texture ("lean")
    python3 scripts/flesh.py --lean 0 --bands 6 --tile 132x84 --amp 7.5
    python3 scripts/flesh.py --preview /tmp/flesh.html   # also write a strip to look at
"""
import argparse
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "packages" / "shared" / "src" / "theme" / "flesh.ts"

# The shipped parameters — variant "lean" of the seven that were compared.
# Every other variant of that family is still reachable from the flags below.
DEFAULTS = dict(
    bands=5,          # bands per tile width
    tile_w=138.0,     # tile width, in the units the paths are authored in
    tile_h=88.0,      # tile height, same units; also the rendered pixel height
    lean=2,           # band-slots a band drifts per tile height; 0 is vertical
    lobes=2,          # chevron cycles per tile height — a W is 2
    amp=8.0,          # chevron amplitude
    sharp=0.5,        # 0 = sine, 1 = triangle
    warp=3.6,         # amplitude of the irregularity field
    opacity=0.20,     # peak stroke opacity of the top pass
    width=1.8,        # top-pass stroke width
    passes=3,         # soft-edge stack depth
    half=0.5,         # opacity of the intruding half-bands; 0 disables them
    fade=0.45,        # depth of the along-band envelope; 0 is a flat, even texture
    seed=21,
)


class Lcg:
    """Tiny deterministic RNG — the output has to be reproducible."""

    def __init__(self, seed: int) -> None:
        self.state = seed * 2654435761 % (2 ** 32)

    def next(self) -> float:
        self.state = (1103515245 * self.state + 12345) % (2 ** 31)
        return self.state / (2 ** 31)

    def uniform(self, a: float, b: float) -> float:
        return a + (b - a) * self.next()

    def pick(self, seq):
        return seq[int(self.next() * len(seq)) % len(seq)]


def chevron(t: float, sharp: float) -> float:
    """The W profile: a sine blended toward a triangle for the corner, plus a
    second harmonic so the two lobes are unequal. A real myomere's mid-height
    part bows toward the head, and a symmetric zigzag reads as knitwear."""
    s = math.sin(2 * math.pi * t)
    tri = 2 / math.pi * math.asin(max(-1.0, min(1.0, s)))
    return (s * (1 - sharp) + tri * sharp) * 0.82 + 0.3 * math.sin(4 * math.pi * t + 0.9)


def harmonics(seed: int, count: int):
    """Whole-number-frequency sine terms — periodic in both axes by
    construction, which is what makes the tile joinable. A `q` of 0 makes a
    term vary only from band to band, jittering the spacing so the bands are
    not evenly ruled."""
    rnd = Lcg(seed)
    out = []
    for _ in range(count):
        p = rnd.pick([0, 1, 1, 2, 2, 3])
        q = rnd.pick([0, 1, 1, 2, 2, 3, 4])
        if p == 0 and q == 0:
            q = 1
        out.append((p, q, rnd.uniform(0.35, 1.0), rnd.uniform(0, 2 * math.pi)))
    return out


class Field:
    """The band field. Every path and every opacity stop is read off this."""

    def __init__(self, cfg: dict) -> None:
        self.cfg = cfg
        self.s = cfg["tile_w"] / cfg["bands"]
        self.shear = cfg["lean"] * self.s / cfg["tile_h"]
        self.warp_terms = harmonics(cfg["seed"], 5)
        self.fade_terms = harmonics(cfg["seed"] + 101, 4)
        # Amplitude varies band to band, never along a band: `q` forced to 0.
        self.amp_terms = [(max(1, p), 0, a, ph) for p, _, a, ph in harmonics(cfg["seed"] + 7, 2)]

    def _sum(self, terms, x: float, y: float) -> float:
        cfg = self.cfg
        total = weight = 0.0
        for p, q, a, phase in terms:
            total += a * math.sin(
                2 * math.pi * (p * x / cfg["tile_w"] + q * y / cfg["tile_h"]) + phase
            )
            weight += a
        return total / weight if weight else 0.0

    def x_at(self, k: float, y: float) -> float:
        """Band k's x at height y. Defined for every y, including outside the
        tile, which is what makes the join across the edge smooth and not just
        continuous."""
        cfg = self.cfg
        base = k * self.s + self.shear * y
        amp = cfg["amp"] * (0.72 + 0.28 * self._sum(self.amp_terms, base, y))
        return (
            base
            + amp * chevron(cfg["lobes"] * y / cfg["tile_h"], cfg["sharp"])
            + cfg["warp"] * self._sum(self.warp_terms, base, y)
        )

    def fade_at(self, k: float, y: float, bite: float = 1.0) -> float:
        """Opacity at a point along band k, never zero. The floor is the point:
        a band that reaches zero at a tile edge takes the texture with it.

        Sampled from the same periodic field as the geometry, at the band's own
        position, so the value where a band leaves the tile is the value where
        its continuation enters — continuity of the envelope comes from the
        field, not from both ends happening to be zero.
        """
        depth = self.cfg["fade"]
        base = k * self.s + self.shear * y
        e = (1 - depth) + depth * self._sum(self.fade_terms, base, y)
        return max(0.05, min(1.0, e)) ** bite


def catmull_path(points) -> str:
    """Points to cubic beziers. The tangents come from samples taken outside
    the drawn range, so the joint with the next tile is smooth, not kinked."""
    out = [f"M {points[1][0]:.2f},{points[1][1]:.2f}"]
    for i in range(1, len(points) - 2):
        p0, p1, p2, p3 = points[i - 1], points[i], points[i + 1], points[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        out.append(
            f"C {c1[0]:.2f},{c1[1]:.2f} {c2[0]:.2f},{c2[1]:.2f} {p2[0]:.2f},{p2[1]:.2f}"
        )
    return " ".join(out)


def build(cfg: dict):
    """Returns (paths, strokes, fades, wrapped).

    `strokes` are the bands of one field period — the drawing itself.
    `wrapped` adds the copies displaced by a whole tile width, which is the
    `overflow="visible"` the DOM would do for us and `react-native-svg`'s
    `Pattern` has no prop for. Both index into `paths`.
    """
    field = Field(cfg)
    samples = max(24, cfg["lobes"] * 16)
    step = cfg["tile_h"] / samples
    # Sampled one step past each edge so the curve's tangent at the edge comes
    # from the field, not from the end of the array.
    ys = [(i - 1) * step for i in range(samples + 3)]

    # Half-steps are the intruding half-bands: myoseptal cones span more than
    # one vertebra, so consecutive sheets overlap in projection. Drawing those
    # faint and heavily broken is what stops the texture reading as stripes.
    step_k = 0.5 if cfg["half"] else 1.0
    count = int(cfg["bands"] / step_k)
    ks = [i * step_k for i in range(count)]

    paths: list[str] = []
    strokes: list[tuple[int, float, float, int]] = []
    fades: list[list[tuple[float, float]]] = []

    for k in ks:
        minor = k != int(k)
        points = [(field.x_at(k, y), y) for y in ys]
        path_index = len(paths)
        paths.append(catmull_path(points))
        bite = 3.0 if minor else 1.0
        fade_index = len(fades)
        # Stops run down the band, which is what the gradient in both
        # renderers addresses: every band spans the tile's full height, so
        # offset t is height t*H and the field can be sampled there directly.
        fades.append(
            [(i / 8, round(field.fade_at(k, i / 8 * cfg["tile_h"], bite), 3)) for i in range(9)]
        )
        peak = cfg["opacity"] * (cfg["half"] if minor else 1.0)
        for p in range(cfg["passes"]):
            # Wide-and-faint under narrow-and-strong: the soft edge a blur
            # would give, done with strokes because mobile has no filters.
            grow = 1 + 1.15 * (cfg["passes"] - 1 - p)
            strokes.append(
                (
                    path_index,
                    round(cfg["width"] * grow * (0.8 if minor else 1.0), 2),
                    round(peak / grow ** 1.35, 4),
                    fade_index,
                )
            )

    # A band whose ink reaches past an edge is redrawn one tile over, so the
    # tile is covered from edge to edge without relying on pattern overflow.
    wrapped: list[tuple[str, float, float, int]] = []
    for path_index, width, opacity, fade_index in strokes:
        xs = [x for x, _ in extract_points(paths[path_index])]
        lo, hi = min(xs) - width / 2, max(xs) + width / 2
        for dx in (-cfg["tile_w"], 0.0, cfg["tile_w"]):
            if lo + dx < cfg["tile_w"] and hi + dx > 0:
                wrapped.append((path_index, dx, width, opacity, fade_index))
    return paths, strokes, fades, wrapped


def extract_points(d: str):
    """Every x,y pair in a path. The emitted format is uniform, so this is
    enough — the same trick `flesh.ts` uses to shift a path sideways."""
    return [(float(x), float(y)) for x, y in re.findall(r"(-?[\d.]+),(-?[\d.]+)", d)]


def render(cfg: dict, paths, strokes, fades, wrapped) -> str:
    field = Field(cfg)
    rake = math.degrees(math.atan(field.shear))
    peak = max(o for _, _, o, _ in strokes)
    floor = min(min(a for _, a in stops) for stops in fades)

    paths_src = "\n".join(f"  '{d}'," for d in paths)
    fades_src = "\n".join(
        "  [" + ", ".join(f"[{o:g}, {a:g}]" for o, a in stops) + "]," for stops in fades
    )
    strokes_src = "\n".join(
        f"  [paths[{i}], {w:g}, {o:g}, {f}]," for i, w, o, f in strokes
    )
    wrapped_src = "\n".join(
        f"  [{'paths[%d]' % i if dx == 0 else 'shiftX(paths[%d], %g)' % (i, dx)}, {w:g}, {o:g}, {f}],"
        for i, dx, w, o, f in wrapped
    )

    return f'''/**
 * GENERATED FILE — do not edit by hand.
 *
 * The myoseptal texture of salmon flesh, as path data, produced by
 * `scripts/flesh.py`. Regenerate — or retune — with:
 *
 *     python3 scripts/flesh.py
 *
 * Hand edits are lost on the next run. The reasoning below describes what the
 * generator does; the reasoning for *why* lives in that script's docstring.
 *
 * Companion to the scales motif, and deliberately its opposite. Scales are
 * skin: the outside of the animal, and the right texture for a ground or a
 * plane. A filled button is mass, not surface — it is the inside of the thing
 * — so the honest material for it is what you see when the fish is cut open:
 * the myosepta, pale sheets of collagen and lipid separating the muscle
 * blocks.
 *
 * Anatomy this draws, and why it is shaped this way:
 *  - Bands run ACROSS the fillet, raked {rake:.0f}° off vertical. Myosepta angle back
 *    along the fish; bands running with the long axis read as wood grain
 *    instead. (van Leeuwen, JEB 202:3405)
 *  - Each band is a W: nested cones, dorsal and ventral, with the mid-height
 *    part bowing toward the head, and the two lobes deliberately unequal.
 *  - Cone traces span more than one vertebra, so consecutive myosepta overlap
 *    in projection. The faint half-bands between the full ones are that
 *    overlap, and they are what stops the texture reading as parallel stripes.
 *  - Bands are PALE, never dark. The pale stripe is collagen plus the fat that
 *    concentrates in the myocommata. Dark slits mean gaping, which is a defect,
 *    not healthy flesh.
 *
 * How it tiles, which is the property most easily broken by a well-meaning
 * edit: every band is a level set of one field whose frequencies are whole
 * numbers over the tile in both axes, and the tile height is chosen so a band
 * leaving the bottom edge is exactly the band {cfg["lean"]} slots over entering the top —
 * same position and same slope. The opacity envelopes are sampled from the
 * same field at absolute horizontal positions, so where a band leaves the tile
 * its continuation picks up at exactly the value it left at, and one tile over
 * the whole field repeats. Nothing is pinned to zero at an edge; a band that
 * fades out at the boundary does not hide the repeat, it advertises it as an
 * untextured column — which is precisely what the previous texture did.
 *
 * Two platform constraints shaped the data:
 *
 *  1. NO FILTERS. `react-native-svg` (checked at 15.15.3) implements
 *     `FeTurbulence` and `FeDisplacementMap` as `warnUnimplementedFilter();
 *     return null`, so procedural noise does not exist on mobile. All the
 *     irregularity is authored into the path data below, and the soft edge is
 *     faked with stacked strokes rather than a blur. Gradients on stroke ARE
 *     natively supported, so the along-band fade is portable. Both renderers
 *     run it down the band's bounding box — every band spans the tile's full
 *     height, so a stop's offset is simply a height within the tile.
 *
 *  2. CONTRAST IS FREE. Every band is lighter than the fill it sits on, so the
 *     texture can only ever raise the luminance under a label. Worst-case
 *     contrast for ink on a salmon fill is therefore exactly the flat fill's —
 *     this texture cannot reduce label contrast at all. Introducing a band
 *     darker than the fill, at any opacity, would break that guarantee;
 *     `flesh.test.ts` asserts against it.
 *
 * Path data rather than an `.svg` import, for the same reason as `brand.ts`:
 * strings need no bundler support and cannot drift between platforms. Both
 * `packages/ui` and `apps/mobile` draw exactly these arrays; nothing is
 * randomised at render time.
 */

/** The drawing's native tile, in the units the paths are authored in. */
export const fleshTile = {{ width: {cfg["tile_w"]:g}, height: {cfg["tile_h"]:g} }} as const;

/** One gradient stop along a band's length: `[offset, opacity]`. */
export type FleshFadeStop = readonly [offset: number, opacity: number];

/**
 * Opacity envelopes running along a band's length, sampled from the same
 * periodic field the geometry comes from. They never reach zero: the floor is
 * {floor:g}, so the texture is as alive at a tile edge as anywhere else.
 */
export const fleshFades: ReadonlyArray<ReadonlyArray<FleshFadeStop>> = [
{fades_src}
];

/**
 * One stroke: `[path, width, opacity, fade index]`. Bands are pre-expanded
 * into their soft-edge stacks — a wide faint pass under a narrow stronger one
 * — so a renderer only has to map over this array.
 */
export type FleshStroke = readonly [d: string, width: number, opacity: number, fade: number];

/** The band curves. Several strokes share one, which is the soft-edge stack. */
const paths = [
{paths_src}
];

/** Every `x,y` pair in the authored path data. The format is uniform. */
const POINT = /(-?[\\d.]+),(-?[\\d.]+)/g;

/** Shifts a whole path sideways, which for this data is an x-only rewrite. */
const shiftX = (d: string, dx: number): string =>
  d.replace(POINT, (_, x: string, y: string) => `${{(Number(x) + dx).toFixed(2)}},${{y}}`);

/** The bands of one field period — the drawing itself, before it is wrapped. */
export const fleshStrokes: ReadonlyArray<FleshStroke> = [
{strokes_src}
];

/**
 * The strokes a renderer actually draws: the bands above, plus the copies
 * displaced by a whole tile width wherever a band's ink reaches past an edge.
 * This is the `overflow="visible"` the DOM would otherwise do for us,
 * resolved here because `react-native-svg`'s `Pattern` has no such prop and
 * would silently clip instead.
 */
export const fleshTiledStrokes: ReadonlyArray<FleshStroke> = [
{wrapped_src}
];
'''


def preview(cfg: dict, out: Path, strokes, fades, wrapped, paths) -> None:
    """Three tiles side by side with the repeat boundaries marked — the strip
    `seam_check.py` measures. Written only when `--preview` asks for it."""
    fill, band = "#FF5C45", "#FFF1EE"
    tw, th = cfg["tile_w"], cfg["tile_h"]
    defs = "".join(
        f'<linearGradient id="f{i}" x1="0" y1="0" x2="0" y2="1">'
        + "".join(
            f'<stop offset="{o}" stop-color="{band}" stop-opacity="{a}"/>' for o, a in stops
        )
        + "</linearGradient>"
        for i, stops in enumerate(fades)
    )
    body = "".join(
        f'<path d="{paths[i] if dx == 0 else shift_path(paths[i], dx)}" stroke="url(#f{f})" '
        f'stroke-opacity="{o}" stroke-width="{w}" stroke-linecap="round" fill="none"/>'
        for i, dx, w, o, f in wrapped
    )
    svg = (
        f'<svg width="{tw * 3:g}" height="{th:g}" xmlns="http://www.w3.org/2000/svg">'
        f'<defs>{defs}<pattern id="p" patternUnits="userSpaceOnUse" '
        f'width="{tw:g}" height="{th:g}">{body}</pattern></defs>'
        f'<rect width="100%" height="100%" fill="{fill}"/>'
        f'<rect width="100%" height="100%" fill="url(#p)"/></svg>'
    )
    button = (
        f'<div style="position:relative;width:320px;height:56px;border-radius:14px;'
        f'overflow:hidden;display:grid;place-items:center">'
        f'<svg width="320" height="56" style="position:absolute;inset:0" '
        f'xmlns="http://www.w3.org/2000/svg"><defs>{defs}'
        f'<pattern id="pb" patternUnits="userSpaceOnUse" width="{tw:g}" height="{th:g}">{body}'
        f'</pattern></defs><rect width="100%" height="100%" fill="{fill}"/>'
        f'<rect width="100%" height="100%" fill="url(#pb)"/></svg>'
        f'<span style="position:relative;color:#070911;font:600 14.5px system-ui">'
        f'APPROVE &amp; SIGN</span></div>'
    )
    out.write_text(
        '<!doctype html><meta charset="utf-8"><title>flesh</title>'
        '<body style="margin:0;background:#0B0F19;padding:24px">'
        f'<div id="strip" style="line-height:0;width:{tw * 3:g}px">{svg}</div>'
        f'<div style="height:24px"></div>{button}</body>'
    )
    print(f"preview: {out}")


def shift_path(d: str, dx: float) -> str:
    return re.sub(
        r"(-?[\d.]+),(-?[\d.]+)", lambda m: f"{float(m[1]) + dx:.2f},{m[2]}", d
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--bands", type=int, default=DEFAULTS["bands"])
    parser.add_argument("--tile", default=f'{DEFAULTS["tile_w"]:g}x{DEFAULTS["tile_h"]:g}',
                        help="tile size as WxH in authoring units")
    parser.add_argument("--lean", type=int, default=DEFAULTS["lean"],
                        help="band-slots of drift per tile height; must be a whole number")
    parser.add_argument("--lobes", type=int, default=DEFAULTS["lobes"])
    parser.add_argument("--amp", type=float, default=DEFAULTS["amp"])
    parser.add_argument("--sharp", type=float, default=DEFAULTS["sharp"])
    parser.add_argument("--warp", type=float, default=DEFAULTS["warp"])
    parser.add_argument("--opacity", type=float, default=DEFAULTS["opacity"])
    parser.add_argument("--width", type=float, default=DEFAULTS["width"])
    parser.add_argument("--passes", type=int, default=DEFAULTS["passes"])
    parser.add_argument("--half", type=float, default=DEFAULTS["half"],
                        help="opacity of the intruding half-bands; 0 disables them")
    parser.add_argument("--fade", type=float, default=DEFAULTS["fade"],
                        help="depth of the along-band opacity envelope; 0 draws every band evenly")
    parser.add_argument("--seed", type=int, default=DEFAULTS["seed"])
    parser.add_argument("-o", "--out", type=Path, default=OUT)
    parser.add_argument("--preview", type=Path, help="also write an HTML strip to look at")
    args = parser.parse_args()

    tile_w, tile_h = (float(n) for n in args.tile.lower().split("x"))
    cfg = dict(
        bands=args.bands, tile_w=tile_w, tile_h=tile_h, lean=args.lean, lobes=args.lobes,
        amp=args.amp, sharp=args.sharp, warp=args.warp, opacity=args.opacity,
        width=args.width, passes=args.passes, half=args.half, fade=args.fade,
        seed=args.seed,
    )

    paths, strokes, fades, wrapped = build(cfg)
    args.out.write_text(render(cfg, paths, strokes, fades, wrapped))
    print(
        f"{args.out}  tile {tile_w:g}x{tile_h:g}  "
        f"{len(paths)} bands  {len(strokes)} strokes  {len(wrapped)} drawn  "
        f"{len(fades)} envelopes"
    )
    if args.preview:
        preview(cfg, args.preview.expanduser(), strokes, fades, wrapped, paths)


if __name__ == "__main__":
    main()
