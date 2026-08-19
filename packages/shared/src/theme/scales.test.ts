import { describe, expect, it } from 'vitest';
import { seigaihaPaths, seigaihaTile, seigaihaTiledPaths, shiftSeigaiha } from './scales';

/**
 * The tile is a pattern cell, and a pattern cell clips: `react-native-svg`'s
 * `Pattern` has no `overflow="visible"`, and on iOS the cell is a
 * `CGPatternCreate` bounds rect that CoreGraphics clips against. So every bit
 * of ink that leaves the tile has to be re-entered from the opposite edge by
 * an explicit copy, or that ink exists on one platform and not the other.
 *
 * These tests read the curves rather than the numbers: the path data is
 * cubics, and the control points sit far outside the tile while the curve
 * itself does not, so a bounding box over the raw coordinates would lie.
 */

const SAMPLES = 64;

/** `M x y (C x1 y1 x2 y2 x y)*` — the only shape this data takes. */
function points(d: string): Array<[number, number]> {
  const n = d
    .slice(1)
    .trim()
    .split(/[C\s,]+/)
    .filter(Boolean)
    .map(Number);
  const out: Array<[number, number]> = [];
  let x = n[0];
  let y = n[1];
  for (let i = 2; i + 5 < n.length; i += 6) {
    const seg = [x, y, n[i], n[i + 1], n[i + 2], n[i + 3], n[i + 4], n[i + 5]];
    for (let k = 0; k <= SAMPLES; k++) {
      const t = k / SAMPLES;
      const u = 1 - t;
      const at = (a: number, b: number, c: number, e: number) =>
        u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * e;
      out.push([at(seg[0], seg[2], seg[4], seg[6]), at(seg[1], seg[3], seg[5], seg[7])]);
    }
    x = seg[6];
    y = seg[7];
  }
  return out;
}

const { width: W, height: H } = seigaihaTile;
const inside = ([x, y]: [number, number]) => x >= 0 && x <= W && y >= 0 && y <= H;

describe('seigaiha geometry', () => {
  it('parses as cubics whose curves stay near the tile', () => {
    for (const d of seigaihaPaths) {
      const p = points(d);
      expect(p.length).toBeGreaterThan(100);
      expect(p.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    }
  });

  it('draws every neighbouring tile whose ink reaches into this one', () => {
    // A cell clips, so ink that belongs to a neighbouring repeat has to be
    // drawn here explicitly. If a curve is edited so it crosses an edge, this
    // fails until the matching displaced copy is added to `seigaihaTiledPaths`.
    const missing: string[] = [];
    seigaihaPaths.forEach((d, i) => {
      for (const dx of [-W, 0, W]) {
        for (const dy of [-H, 0, H]) {
          if (dx === 0 && dy === 0) continue;
          const reaches = points(d).some(([x, y]) => inside([x + dx, y + dy]));
          if (!reaches) continue;
          const copy = shiftSeigaiha(d, dx, dy);
          if (!seigaihaTiledPaths.includes(copy)) {
            missing.push(`path ${i} at (${dx}, ${dy})`);
          }
        }
      }
    });
    expect(missing).toEqual([]);
  });

  it('carries no copy that never enters the tile', () => {
    // The other half of the same invariant: a displaced copy that lands
    // entirely outside is stroke work every frame for no pixels.
    for (const d of seigaihaTiledPaths) {
      expect(points(d).some(inside)).toBe(true);
    }
  });

  it('tiles at the drawing’s own period', () => {
    // Row 2 is row 1 translated; the tile is one full period of that lattice.
    // A tile wider or taller than the period leaves a bare column or band at
    // every repeat, which is what the exported artboard size used to do.
    const rowSpan = (a: string) => {
      const xs = points(a).map(([x]) => x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(rowSpan(seigaihaPaths[0])).toBeCloseTo(W, 2);
    expect(rowSpan(seigaihaPaths[1])).toBeCloseTo(W, 2);

    const rowOffset = points(seigaihaPaths[1])[0][1] - points(seigaihaPaths[0])[0][1];
    expect(2 * rowOffset).toBeCloseTo(H, 2);
  });

  it('rests every cusp exactly on an arc apex of the row below', () => {
    // The seigaiha relation itself: the two points where an arc ends (the
    // cusps) sit on the topmost point of the arcs flanking it from the row
    // below. The paths are generated from the formula in `scales.ts` so this
    // holds to float precision; hand-edited numbers broke it by up to 1.23
    // units, which is what this test exists to prevent.
    const arcs = (d: string) => {
      const p = points(d);
      const out: Array<Array<[number, number]>> = [];
      for (let i = 0; i < p.length; i += SAMPLES + 1) out.push(p.slice(i, i + SAMPLES + 1));
      return out;
    };
    const cuspsOf = (d: string) => arcs(d).map((a) => a[0]).concat([arcs(d).at(-1)![SAMPLES]]);
    const apexesOf = (d: string) =>
      arcs(d).map((a) => a.reduce((top, pt) => (pt[1] < top[1] ? pt : top)));
    const wrap = (dx: number) => ((dx % W) + 1.5 * W) % W - W / 2;

    const rests = (cusps: Array<[number, number]>, apexes: Array<[number, number]>, dy: number) =>
      cusps.every(([cx, cy]) =>
        apexes.some(([ax, ay]) => Math.abs(wrap(cx - ax)) < 1e-6 && Math.abs(cy - ay - dy) < 1e-6)
      );

    // Row 1 cusps on row 2 apexes; row 2 cusps on the next period's row 1.
    expect(rests(cuspsOf(seigaihaPaths[0]), apexesOf(seigaihaPaths[1]), 0)).toBe(true);
    expect(rests(cuspsOf(seigaihaPaths[1]), apexesOf(seigaihaPaths[0]), H)).toBe(true);
  });

  it('shifts paths without disturbing their shape', () => {
    const moved = points(shiftSeigaiha(seigaihaPaths[0], 10, -3));
    points(seigaihaPaths[0]).forEach(([x, y], i) => {
      expect(moved[i][0]).toBeCloseTo(x + 10, 3);
      expect(moved[i][1]).toBeCloseTo(y - 3, 3);
    });
  });
});
