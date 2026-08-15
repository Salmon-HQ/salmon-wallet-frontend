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
 * The rest pin the drawing that was actually judged — tile size, band count,
 * the restrained opacity range, the zero-pinned fade ends that stop a seam —
 * and the tile-wrap expansion that replaces `overflow="visible"` for mobile.
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
 * The constant `dy` that turns `authored` into `candidate`, or `null` if the
 * two are not a pure vertical translation of one another. Identity has to come
 * from the path itself — width/opacity/fade are shared by several bands.
 */
const verticalShift = (authored: string, candidate: string): number | null => {
  const [a, b] = [points(authored), points(candidate)];
  if (a.length !== b.length || a.length === 0) return null;
  if (a.some(([x], i) => x !== b[i][0])) return null;
  const shifts = new Set(a.map(([, y], i) => (b[i][1] - y).toFixed(2)));
  return shifts.size === 1 ? Number([...shifts][0]) : null;
};

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
    expect(fleshTile).toEqual({ width: 380, height: 40 });
  });

  it('keeps 7 fade envelopes and 54 authored strokes', () => {
    expect(fleshFades).toHaveLength(7);
    expect(fleshStrokes).toHaveLength(54);
  });

  it('keeps every stroke inside the restrained opacity range', () => {
    // Ceiling is the base 0.085 times the per-band prominence spread. A stroke
    // outside it is either invisible or loud enough to read as a graphic.
    for (const [, , strokeOpacity] of fleshStrokes) {
      expect(strokeOpacity).toBeGreaterThan(0);
      expect(strokeOpacity).toBeLessThanOrEqual(0.12);
    }
  });

  it('pins every fade envelope to zero at both ends, so no band seams', () => {
    for (const stops of fleshFades) {
      expect(stops[0]).toEqual([0, 0]);
      expect(stops[stops.length - 1]).toEqual([1, 0]);
    }
  });

  it('points every stroke at a fade envelope that exists', () => {
    for (const [, , , fade] of fleshStrokes) {
      expect(fleshFades[fade]).toBeDefined();
    }
  });
});

describe('flesh: the baked tile wrap', () => {
  // `react-native-svg`'s Pattern has no `overflow` prop, so the bands that
  // spill past the tile are repeated into it here instead. If this expansion
  // regresses, mobile loses a third of its bands and grows a seam per tile.

  it('repeats every authored stroke at least once', () => {
    expect(fleshTiledStrokes.length).toBeGreaterThanOrEqual(fleshStrokes.length);
    for (const [d] of fleshStrokes) {
      expect(fleshTiledStrokes.some(([t]) => verticalShift(d, t) !== null)).toBe(true);
    }
  });

  it('draws nothing that misses the tile entirely', () => {
    for (const [d, width] of fleshTiledStrokes) {
      const ys = points(d).map(([, y]) => y);
      expect(Math.min(...ys) - width / 2).toBeLessThan(fleshTile.height);
      expect(Math.max(...ys) + width / 2).toBeGreaterThan(0);
    }
  });

  it('shifts bands by whole tiles only, leaving the drawing itself untouched', () => {
    for (const [d] of fleshTiledStrokes) {
      const shifts = fleshStrokes
        .map(([authored]) => verticalShift(authored, d))
        .filter((dy): dy is number => dy !== null);
      expect(shifts.length).toBeGreaterThan(0);
      // A fractional or arbitrary offset would break the repeat alignment.
      expect(shifts.every((dy) => [-fleshTile.height, 0, fleshTile.height].includes(dy))).toBe(
        true
      );
    }
  });

  it('carries every band across the tile boundary it straddles', () => {
    const { height } = fleshTile;
    for (const [d, width] of fleshStrokes) {
      const ys = points(d).map(([, y]) => y);
      const [minY, maxY] = [Math.min(...ys) - width / 2, Math.max(...ys) + width / 2];
      const needed = [-height, 0, height].filter((dy) => minY + dy < height && maxY + dy > 0);
      const drawn = fleshTiledStrokes
        .map(([tiled, tiledWidth]) => (tiledWidth === width ? verticalShift(d, tiled) : null))
        .filter((dy): dy is number => dy !== null);
      expect([...drawn].sort((a, b) => a - b)).toEqual(needed.sort((a, b) => a - b));
    }
  });
});
