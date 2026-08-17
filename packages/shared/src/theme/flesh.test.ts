import { describe, expect, it } from 'vitest';

import { fleshFades, fleshStrokes, fleshTile, fleshTiledStrokes } from './flesh';
import { accent, flesh, text } from './semantic';

/**
 * The flesh texture's safety properties.
 *
 * The load-bearing one is **pale-only**: every band is lighter than the fill
 * it sits on, so the texture can only raise the luminance under a label and
 * the worst case stays exactly the flat fill's ratio. That is what makes this
 * texture free of a contrast budget rather than subject to one, and it is a
 * property a future edit could silently destroy by darkening the band token or
 * by adding a band drawn in something other than that token. Both are asserted
 * here.
 *
 * The second is **continuity across the tile edge**. A previous version of
 * this file asserted the opposite — that every fade envelope was pinned to
 * opacity 0 at both ends "so no band seams" — and that assertion was the bug:
 * because each band crosses the whole tile, zeroing every envelope at the
 * edges extinguished the entire texture there, and the repeat showed up as a
 * bare strip every tile. The correct condition, asserted below, is that a band
 * leaving the tile is picked up by another band entering it at the same place,
 * the same angle and the same opacity. `flesh.ts` is generated to satisfy that
 * by construction; these tests are what notices if a regeneration stops doing
 * so.
 *
 * The rest pin the drawing that was actually judged — tile size, band count,
 * the restrained opacity range — and the tile-wrap expansion that replaces
 * `overflow="visible"` for mobile.
 */

/** WCAG 2.1 relative luminance. */
const luminance = (hex: string): number => {
  const normalized = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(normalized.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Compositing a band over the fill at `alpha`. Straight alpha in sRGB is what
 * the renderers actually do, so the test does the same rather than blending in
 * linear light and flattering itself.
 */
const composite = (over: string, under: string, alpha: number): string => {
  const parse = (hex: string) =>
    [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16));
  const [a, b] = [parse(over), parse(under)];
  return `#${a
    .map((channel, i) =>
      Math.round(channel * alpha + b[i] * (1 - alpha))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
};

/** Every `x,y` pair in a path. */
const points = (d: string): ReadonlyArray<readonly [number, number]> =>
  Array.from(d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g), (m) => [Number(m[1]), Number(m[2])] as const);

/**
 * The constant `dx` that turns `authored` into `candidate`, or `null` if the
 * two are not a pure horizontal translation of one another. Identity has to
 * come from the path itself — width/opacity/fade are shared by several bands.
 */
const horizontalShift = (authored: string, candidate: string): number | null => {
  const [a, b] = [points(authored), points(candidate)];
  if (a.length !== b.length || a.length === 0) return null;
  if (a.some(([, y], i) => y !== b[i][1])) return null;
  const shifts = new Set(a.map(([x], i) => (b[i][0] - x).toFixed(2)));
  return shifts.size === 1 ? Number([...shifts][0]) : null;
};

/** Where a band enters the tile, and the direction it is travelling. */
const entry = (d: string) => {
  const [start, control] = points(d);
  return { at: start, heading: Math.atan2(control[1] - start[1], control[0] - start[0]) };
};

/** Where a band leaves the tile, and the direction it is travelling. */
const exit = (d: string) => {
  const p = points(d);
  const [control, end] = [p[p.length - 2], p[p.length - 1]];
  return { at: end, heading: Math.atan2(end[1] - control[1], end[0] - control[0]) };
};

/** Positions in the tile are the same position when they are a tile apart. */
const wrapX = (x: number): number => ((x % fleshTile.width) + fleshTile.width) % fleshTile.width;

describe('flesh: the pale-only property', () => {
  it('draws the band lighter than the salmon fill it sits on', () => {
    expect(luminance(flesh.band)).toBeGreaterThan(luminance(accent.fill));
  });

  it('cannot lower label contrast at any band opacity', () => {
    const flat = contrast(text.onAccent, accent.fill);
    // Sweep the whole legal alpha range, not just the ones in use: the claim
    // is about the class of textures, not about today's numbers.
    for (let alpha = 0; alpha <= 1.0001; alpha += 0.05) {
      const banded = composite(flesh.band, accent.fill, alpha);
      expect(contrast(text.onAccent, banded)).toBeGreaterThanOrEqual(flat - 0.01);
    }
  });

  it('keeps the flat fill as the worst case, above AA', () => {
    expect(contrast(text.onAccent, accent.fill)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('flesh: the judged drawing', () => {
  it('keeps the authored tile', () => {
    expect(fleshTile).toEqual({ width: 138, height: 88 });
  });

  it('keeps 10 fade envelopes and 30 authored strokes', () => {
    expect(fleshFades).toHaveLength(10);
    expect(fleshStrokes).toHaveLength(30);
  });

  it('keeps every stroke inside the restrained opacity range', () => {
    // Ceiling is the top pass's peak. A stroke outside it is either invisible
    // or loud enough to read as a graphic rather than as material.
    for (const [, , strokeOpacity] of fleshStrokes) {
      expect(strokeOpacity).toBeGreaterThan(0);
      expect(strokeOpacity).toBeLessThanOrEqual(0.2);
    }
  });

  it('points every stroke at a fade envelope that exists', () => {
    for (const [, , , fade] of fleshStrokes) {
      expect(fleshFades[fade]).toBeDefined();
    }
  });
});

describe('flesh: continuity across the tile edge', () => {
  // The bands are raked, so each one leaves through the bottom of the tile and
  // is continued by a different band entering through the top. If any of the
  // three things that have to agree there — position, heading, opacity — stops
  // agreeing, the repeat becomes visible, which is the whole failure mode this
  // texture was regenerated to fix.

  const bands = [...new Set(fleshStrokes.map(([d]) => d))];

  it('keeps every fade envelope alive at both ends', () => {
    // The old data pinned these to zero, which did not hide the repeat: it
    // switched the texture off in a strip at every tile boundary.
    for (const stops of fleshFades) {
      expect(stops[0][0]).toBe(0);
      expect(stops[stops.length - 1][0]).toBe(1);
      expect(stops[0][1]).toBeGreaterThan(0);
      expect(stops[stops.length - 1][1]).toBeGreaterThan(0);
    }
  });

  it('hands each band across the boundary at the same place and angle', () => {
    for (const d of bands) {
      const leaving = exit(d);
      expect(leaving.at[1]).toBeCloseTo(fleshTile.height, 2);

      const continued = bands.filter((other) => {
        const arriving = entry(other);
        return (
          arriving.at[1] === 0 && Math.abs(wrapX(arriving.at[0]) - wrapX(leaving.at[0])) < 0.02
        );
      });
      expect(continued).toHaveLength(1);
      // Within a fifth of a degree: a kink here reads as a crease across the
      // fill once the tile repeats.
      expect(entry(continued[0]).heading).toBeCloseTo(leaving.heading, 2);
    }
  });

  it('hands each band across the boundary at the same opacity', () => {
    const ends = fleshFades.map((stops) => stops[stops.length - 1][1]).sort();
    const starts = fleshFades.map((stops) => stops[0][1]).sort();
    // A bijection, not merely similar ranges: every value a band fades out at
    // is a value some other band fades in at.
    expect(ends).toEqual(starts);
  });

  it('draws every band clear across the tile, not fading out inside it', () => {
    for (const d of bands) {
      expect(entry(d).at[1]).toBe(0);
      expect(exit(d).at[1]).toBe(fleshTile.height);
    }
  });
});

describe('flesh: the baked tile wrap', () => {
  // `react-native-svg`'s Pattern has no `overflow` prop, so the bands that
  // spill sideways past the tile are repeated into it here instead. If this
  // expansion regresses, mobile loses the ink at both vertical edges and grows
  // a bare column per tile.

  it('repeats every authored stroke at least once', () => {
    expect(fleshTiledStrokes.length).toBeGreaterThanOrEqual(fleshStrokes.length);
    for (const [d] of fleshStrokes) {
      expect(fleshTiledStrokes.some(([t]) => horizontalShift(d, t) !== null)).toBe(true);
    }
  });

  it('draws nothing that misses the tile entirely', () => {
    for (const [d, width] of fleshTiledStrokes) {
      const xs = points(d).map(([x]) => x);
      expect(Math.min(...xs) - width / 2).toBeLessThan(fleshTile.width);
      expect(Math.max(...xs) + width / 2).toBeGreaterThan(0);
    }
  });

  it('shifts bands by whole tiles only, leaving the drawing itself untouched', () => {
    for (const [d] of fleshTiledStrokes) {
      const shifts = fleshStrokes
        .map(([authored]) => horizontalShift(authored, d))
        .filter((dx): dx is number => dx !== null);
      expect(shifts.length).toBeGreaterThan(0);
      // A fractional or arbitrary offset would break the repeat alignment.
      expect(shifts.every((dx) => [-fleshTile.width, 0, fleshTile.width].includes(dx))).toBe(true);
    }
  });

  it('carries every band across the tile boundary it straddles', () => {
    const { width: tileWidth } = fleshTile;
    for (const [d, width] of fleshStrokes) {
      const xs = points(d).map(([x]) => x);
      const [minX, maxX] = [Math.min(...xs) - width / 2, Math.max(...xs) + width / 2];
      const needed = [-tileWidth, 0, tileWidth].filter(
        (dx) => minX + dx < tileWidth && maxX + dx > 0
      );
      const drawn = fleshTiledStrokes
        .map(([tiled, tiledWidth]) => (tiledWidth === width ? horizontalShift(d, tiled) : null))
        .filter((dx): dx is number => dx !== null);
      expect([...drawn].sort((a, b) => a - b)).toEqual(needed.sort((a, b) => a - b));
    }
  });
});
