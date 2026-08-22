import { describe, expect, it } from 'vitest';

import { fleshFills, fleshTile } from './flesh';

/**
 * Sanity for the marbled flesh texture. The heavyweight guarantee — pale-only
 * ink in `semantic.flesh.band`, so label contrast can only rise — holds by
 * construction and is covered by `contrast.test.ts` through the token. What
 * is asserted here is the part a retune could silently break: the restrained
 * opacity range, closed filled outlines, ink that stays on its tile, and the
 * baked horizontal wrap mobile depends on (react-native-svg's Pattern cannot
 * overflow).
 */

/** Every `x,y` pair in a path. */
const points = (d: string): ReadonlyArray<readonly [number, number]> =>
  Array.from(d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g), (m) => [Number(m[1]), Number(m[2])] as const);

describe('flesh: the marbled drawing', () => {
  it('keeps every fill inside the restrained opacity range', () => {
    for (const [, fillOpacity] of fleshFills) {
      expect(fillOpacity).toBeGreaterThan(0);
      expect(fillOpacity).toBeLessThanOrEqual(0.2); // the pale-ink ceiling
    }
  });

  it('draws closed, filled outlines', () => {
    for (const [d] of fleshFills) {
      expect(d.startsWith('M ')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
      expect(points(d).length).toBeGreaterThan(8);
    }
  });

  it('keeps every band on its tile vertically', () => {
    for (const [d] of fleshFills) {
      for (const [, y] of points(d)) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(fleshTile.height);
      }
    }
  });

  it('draws nothing that misses the tile entirely', () => {
    for (const [d] of fleshFills) {
      const xs = points(d).map(([x]) => x);
      expect(Math.min(...xs)).toBeLessThan(fleshTile.width);
      expect(Math.max(...xs)).toBeGreaterThan(0);
    }
  });
});

describe('flesh: the baked tile wrap', () => {
  it('carries every band across the vertical edge it straddles', () => {
    // Mobile's Pattern clips at the tile edge, so any band whose ink reaches
    // past it must have a copy shifted by exactly one tile width.
    const { width } = fleshTile;
    for (const [d, fillOpacity] of fleshFills) {
      const xs = points(d).map(([x]) => x);
      const crossings = [
        ...(Math.min(...xs) < 0 ? [width] : []),
        ...(Math.max(...xs) > width ? [-width] : []),
      ];
      for (const dx of crossings) {
        const wrapped = fleshFills.some(
          ([other, otherOpacity]) =>
            otherOpacity === fillOpacity &&
            points(other).every(
              ([x, y], i) => Math.abs(x - (points(d)[i][0] + dx)) < 0.02 && y === points(d)[i][1]
            )
        );
        expect(wrapped).toBe(true);
      }
    }
  });
});
