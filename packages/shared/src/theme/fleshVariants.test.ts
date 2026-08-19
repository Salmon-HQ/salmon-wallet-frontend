import { describe, expect, it } from 'vitest';

import { fleshVariantFills, fleshVariantTiles } from './fleshVariants';

/**
 * Sanity for the candidate textures. The heavyweight guarantees — pale-only
 * band token, label contrast — live in `flesh.test.ts` and hold for the
 * variants too, because they are drawn in the same `semantic.flesh.band`
 * token at opacities inside the same ceiling. What is asserted here is the
 * part a retune could silently break: the restrained opacity range, closed
 * filled outlines, ink that stays on its tile, and the baked horizontal wrap
 * mobile depends on (react-native-svg's Pattern cannot overflow).
 */

/** Every `x,y` pair in a path. */
const points = (d: string): ReadonlyArray<readonly [number, number]> =>
  Array.from(d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g), (m) => [Number(m[1]), Number(m[2])] as const);

describe.each(['marbled', 'chevron'] as const)('fleshVariants: %s', (variant) => {
  const fills = fleshVariantFills[variant];
  const tile = fleshVariantTiles[variant];

  it('keeps every fill inside the restrained opacity range', () => {
    for (const [, fillOpacity] of fills) {
      expect(fillOpacity).toBeGreaterThan(0);
      expect(fillOpacity).toBeLessThanOrEqual(0.2); // the flesh.test.ts ceiling
    }
  });

  it('draws closed, filled outlines', () => {
    for (const [d] of fills) {
      expect(d.startsWith('M ')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
      expect(points(d).length).toBeGreaterThan(8);
    }
  });

  it('keeps every band on its tile vertically', () => {
    for (const [d] of fills) {
      for (const [, y] of points(d)) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(tile.height);
      }
    }
  });

  it('draws nothing that misses the tile entirely', () => {
    for (const [d] of fills) {
      const xs = points(d).map(([x]) => x);
      expect(Math.min(...xs)).toBeLessThan(tile.width);
      expect(Math.max(...xs)).toBeGreaterThan(0);
    }
  });
});

describe('fleshVariants: the baked tile wrap', () => {
  it('carries every marbled band across the vertical edge it straddles', () => {
    // Mobile's Pattern clips at the tile edge, so any band whose ink reaches
    // past it must have a copy shifted by exactly one tile width.
    const { width } = fleshVariantTiles.marbled;
    for (const [d, fillOpacity] of fleshVariantFills.marbled) {
      const xs = points(d).map(([x]) => x);
      const crossings = [
        ...(Math.min(...xs) < 0 ? [width] : []),
        ...(Math.max(...xs) > width ? [-width] : []),
      ];
      for (const dx of crossings) {
        const wrapped = fleshVariantFills.marbled.some(
          ([other, otherOpacity]) =>
            otherOpacity === fillOpacity &&
            points(other).every(
              ([x, y], i) =>
                Math.abs(x - (points(d)[i][0] + dx)) < 0.02 && y === points(d)[i][1]
            )
        );
        expect(wrapped).toBe(true);
      }
    }
  });
});
