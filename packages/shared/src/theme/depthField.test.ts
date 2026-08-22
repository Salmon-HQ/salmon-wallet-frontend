import { describe, expect, it } from 'vitest';

import {
  depthDrift,
  depthRamp,
  depthRampOpacity,
  depthRampSize,
  depthRampZFar,
  depthFieldCycleMs,
  depthFieldTile,
  depthFieldTileHeight,
  marineSnow,
  marineSnowTiled,
  marineSnowSvg,
  wrapDepthOffset,
} from './depthField';
import { water } from './semantic';

/**
 * The marine snow field's safety properties.
 *
 * The load-bearing one is **capped brightness**: no floc may be brighter than
 * the `water.snow` token, because that token is what `contrast.test.ts`
 * measures against the ceiling for a non-informational stroke. A multiplier
 * above 1 in the geometry would quietly route around that assertion, so it is
 * asserted here at the source.
 *
 * The second is **coverage**: the field has to reach the bottom of the column,
 * with no empty band on the way. It used to be the opposite assertion — the
 * field was cropped above the first data row — because the token rows were
 * translucent and the motif would have been legible through an amount. The
 * rows are opaque now, which is what DESIGN.md asked for in the first place,
 * so The Scales Exclusion Rule is enforced by occlusion instead of by a crop.
 * The assertion is kept inverted rather than deleted because a future edit
 * that quietly reintroduces a band is exactly the regression to catch.
 *
 * The rest pin the drawing that was judged — the field's size, the aerial
 * perspective the bands encode, and the fact that nothing is randomised.
 */

describe('marine snow: brightness is capped by the token', () => {
  it('no floc is brighter than water.snow', () => {
    for (const [, , , , opacity] of marineSnow) {
      expect(opacity).toBeLessThanOrEqual(1);
    }
  });

  it('no floc is so faint it is wasted geometry', () => {
    // The floor is a panel limit, not a preference. A multiplier of 0.10 on
    // `water.snow` composites to about 2 levels in 255 against the ramp's
    // lightest stop; below that a floc stops being the far end of a depth
    // ramp and becomes indistinguishable from the ground's own dither. A
    // depth ramp whose far end renders as nothing is not a ramp.
    for (const [, , , , opacity] of marineSnow) {
      expect(opacity).toBeGreaterThanOrEqual(depthRamp.opacityFar);
    }
  });
});

describe('marine snow: the field covers the whole column', () => {
  const { height } = depthFieldTile;

  it('draws all the way to the bottom of the field', () => {
    // The field used to stop before the first data row, which put the motif
    // exactly where the balance card covers it and left the empty lower half
    // of every screen bare. Occlusion by opaque content is what enforces the
    // exclusion rule now; a crop would put the fish back in a band.
    const lowest = Math.max(...marineSnow.map(([, cy, , ry]) => cy + ry));
    expect(lowest).toBeGreaterThan(height * 0.95);
  });

  it('leaves no empty band anywhere down the column', () => {
    for (let i = 0; i < 10; i += 1) {
      const band = marineSnow.filter(
        ([, cy]) => cy >= (height * i) / 10 && cy < (height * (i + 1)) / 10
      );
      expect(band.length).toBeGreaterThan(0);
    }
  });

  it('dims with depth, because that is what carries depth once nothing is cropped', () => {
    const mean = (band: typeof marineSnow) =>
      band.reduce((sum, [, , , , o]) => sum + o, 0) / band.length;
    const top = marineSnow.filter(([, cy]) => cy < height / 2);
    const bottom = marineSnow.filter(([, cy]) => cy >= height / 2);
    expect(mean(top)).toBeGreaterThan(mean(bottom));
  });

  it('is wider than the widest column it has to cover', () => {
    // `componentSizes.webContainerMaxWidth` is 430; a narrower field would
    // leave a bare strip at the edge of a phone-width column.
    expect(depthFieldTile.width).toBeGreaterThanOrEqual(430);
  });

  it('is taller than it is wide, so a uniform cover scale fills a phone column', () => {
    expect(depthFieldTile.height).toBeGreaterThan(depthFieldTile.width * 1.8);
  });
});

describe('marine snow: aerial perspective is in the data', () => {
  // The whole field shrank — max rx went 4.48 → 2.55 — so these thresholds
  // are the new field's near and far thirds, not the old numbers.
  const near = marineSnow.filter(([, , rx]) => rx >= 2.0);
  const far = marineSnow.filter(([, , rx]) => rx < 1.1);

  it('has both a near and a far population', () => {
    expect(near.length).toBeGreaterThan(5);
    expect(far.length).toBeGreaterThan(20);
  });

  it('draws near flocs brighter than far ones', () => {
    const mean = (band: typeof marineSnow) =>
      band.reduce((sum, [, , , , o]) => sum + o, 0) / band.length;
    expect(mean(near)).toBeGreaterThan(mean(far));
  });

  it('pools the far, small flocs deeper in the field — the texture gradient', () => {
    const meanY = (band: typeof marineSnow) =>
      band.reduce((sum, [, cy]) => sum + cy, 0) / band.length;
    expect(meanY(far)).toBeGreaterThan(meanY(near));
  });

  it('squashes flocs, because real aggregates are porous and not spheres', () => {
    for (const [, , rx, ry] of marineSnow) {
      expect(ry).toBeLessThanOrEqual(rx);
    }
    const round = marineSnow.filter(([, , rx, ry]) => ry / rx > 0.98);
    expect(round.length).toBeLessThan(marineSnow.length / 4);
  });
});

describe('marine snow: no floc is left astride a tile edge', () => {
  // A floc is a closed shape, so a tile edge does not thin it, it bisects it:
  // a circle with a straight edge, which reads as a deliberate half-moon and
  // — now that the field repeats and drifts — parades that cut down the
  // screen once per cycle. Either the floc fits, or its exact continuation is
  // drawn a tile over, where it re-enters.
  const { width: W, height: H } = depthFieldTile;
  const has = (floc: readonly number[]) =>
    marineSnowTiled.some((c) => c.every((v, i) => Math.abs(v - floc[i]) < 1e-9));

  it('gives every floc that crosses the top or bottom edge its twin', () => {
    const orphans = marineSnowTiled.filter(([cx, cy, rx, ry, opacity]) => {
      if (cy - ry >= 0 && cy + ry <= H) return false;
      const dy = cy - ry < 0 ? H : -H;
      return !has([cx, cy + dy, rx, ry, opacity]);
    });
    expect(orphans).toEqual([]);
  });

  it('keeps every floc clear of the left and right edges', () => {
    // The field repeats vertically only, so a floc crossing a side edge has
    // nowhere to re-enter from — it can only be moved.
    const cut = marineSnowTiled.filter(([cx, , rx]) => cx - rx < 0 || cx + rx > W);
    expect(cut).toEqual([]);
  });

  it('adds nothing but wrapped copies', () => {
    expect(marineSnowTiled.length).toBeGreaterThan(marineSnow.length);
    for (const floc of marineSnowTiled) {
      const [cx, cy, rx, ry, opacity] = floc;
      const authored =
        marineSnow.includes(floc as never) ||
        marineSnow.some(
          (a) =>
            a[0] === cx &&
            a[2] === rx &&
            a[3] === ry &&
            a[4] === opacity &&
            Math.abs(Math.abs(a[1] - cy) - H) < 1e-9
        );
      expect(authored).toBe(true);
    }
  });
});

describe('marine snow: the serialised field', () => {
  it('renders every floc, and only in the token colour', () => {
    const svg = marineSnowSvg(water.snow);
    expect(svg.match(/<ellipse/g)).toHaveLength(marineSnowTiled.length);
    expect(svg).toContain(`fill="${water.snow}"`);
  });

  it('carries an intrinsic size, so CSS can scale it by height alone', () => {
    const svg = marineSnowSvg(water.snow);
    expect(svg).toContain(`width="${depthFieldTile.width}"`);
    expect(svg).toContain(`height="${depthFieldTile.height}"`);
    expect(svg).toContain(`viewBox="0 0 ${depthFieldTile.width} ${depthFieldTile.height}"`);
  });

  it('is a constant — nothing is randomised at render time', () => {
    expect(marineSnowSvg(water.snow)).toBe(marineSnowSvg(water.snow));
  });
});

/**
 * Size and opacity are one decision, not two.
 *
 * This is the property the field was rebuilt around, and the one most likely
 * to be broken by a well-meaning edit. Every floc is generated from a single
 * optical distance `z`: its radius is the projective law `rxNear / z` and its
 * opacity is Beer–Lambert veiling `exp(-mu * (z - 1))`. So a bigger floc is
 * always a stronger one, and "far" is carried by size and brightness agreeing
 * rather than by either alone.
 *
 * Nudging one floc's opacity without touching its radius — the obvious way to
 * "make the snow pop" — decorrelates the two cues and flattens the ramp back
 * to what it was before. These assertions are what make that fail loudly.
 *
 * The tolerance throughout is the 0.01 the literals are rounded to.
 */
describe('marine snow: size and opacity covary', () => {
  /** The literals are stored to 2dp, so nothing can be pinned tighter. */
  const ROUNDING = 0.01;

  it('gives every floc the opacity its own size implies', () => {
    for (const [, , rx, , opacity] of marineSnow) {
      const z = depthRamp.rxNear / rx;
      expect(Math.abs(opacity - depthRampOpacity(z))).toBeLessThanOrEqual(ROUNDING + 1e-9);
      // and the inverse holds, so the law can be read in either direction
      expect(Math.abs(rx - depthRampSize(z))).toBeLessThanOrEqual(ROUNDING + 1e-9);
    }
  });

  it('never draws a larger floc fainter than a smaller one', () => {
    // The pairwise statement of the same law — this is the one that fails if
    // a single floc is hand-tuned, without needing to know the curve.
    for (const [, , rxA, , opacityA] of marineSnow) {
      for (const [, , rxB, , opacityB] of marineSnow) {
        if (rxA > rxB + ROUNDING) {
          expect(opacityA).toBeGreaterThanOrEqual(opacityB - ROUNDING);
        }
      }
    }
  });

  it('keeps every floc inside the ramp it was generated from', () => {
    for (const [, , rx, , opacity] of marineSnow) {
      expect(rx).toBeGreaterThanOrEqual(depthRamp.rxFar - ROUNDING);
      expect(rx).toBeLessThanOrEqual(depthRamp.rxNear + ROUNDING);
      expect(opacity).toBeLessThanOrEqual(1);
      expect(opacity).toBeGreaterThanOrEqual(depthRamp.opacityFar - 1e-9);
    }
    expect(depthRampZFar).toBeCloseTo(3, 5);
  });

  it('spends the near end of the ramp on opacity, not on size', () => {
    // The flocs are smaller than they were (the brief), so the depth read has
    // to come from somewhere else — brightness picks it up. If someone grows
    // the field back the first assertion catches it; if someone flattens the
    // brightness range to compensate, the second does.
    const rx = marineSnow.map(([, , r]) => r);
    const opacity = marineSnow.map(([, , , , o]) => o);
    expect(Math.max(...rx)).toBeLessThanOrEqual(2.6);
    expect(Math.max(...opacity) - Math.min(...opacity)).toBeGreaterThanOrEqual(0.85);
  });

  it('uses the whole depth range rather than clumping into plates', () => {
    // Continuous, not three layers: no size should hold an outsized share of
    // the field, which is what a sprite-sheet read looks like in the data.
    const buckets = new Map<number, number>();
    for (const [, , rx] of marineSnow) {
      const bucket = Math.round(rx * 10);
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
    for (const count of buckets.values()) {
      expect(count).toBeLessThan(marineSnow.length / 5);
    }
    expect(buckets.size).toBeGreaterThan(12);
  });
});

/**
 * The drift's safety properties.
 *
 * Two of these are load-bearing. **The cycle must close exactly on the tile**:
 * one tile of travel is the only displacement at which the field lands back on
 * a copy of itself, so any other loop length is a visible jump every time it
 * comes round. And **the parallax must add to the drift rather than replace
 * it**, which is what `wrapDepthOffset` is asserted on below — the hand speeds
 * the water up, it does not take it over.
 *
 * The speed itself is a judgement (see `depthDrift`), so it is bounded rather
 * than pinned: fast enough to find if you rest on it, slow enough that a
 * glance cannot.
 */
describe('marine snow: the drift', () => {
  it('is slow enough to be missed at a glance and fast enough to be found', () => {
    // Half a second of glancing must move a floc under ~2px, and ten seconds
    // of staring must move one well past that.
    expect(depthDrift.pxPerSecond * 0.5).toBeLessThan(2);
    expect(depthDrift.pxPerSecond * 10).toBeGreaterThan(20);
  });

  it('moves the far plane less than the content in front of it', () => {
    expect(depthDrift.parallaxFactor).toBeGreaterThan(0);
    expect(depthDrift.parallaxFactor).toBeLessThan(1);
  });

  it('scales the tile from width alone, so the flocs stay round', () => {
    const tile = depthFieldTileHeight(440);
    expect(tile).toBe(depthFieldTile.height);
    expect(depthFieldTileHeight(880)).toBe(depthFieldTile.height * 2);
  });

  it('derives the cycle from the speed, at one tile of travel per loop', () => {
    // A wider column gets a bigger tile and a proportionally longer cycle, so
    // the apparent velocity is the same on a side panel and a desktop window.
    const narrow = depthFieldTileHeight(400);
    const wide = depthFieldTileHeight(1200);
    expect(depthFieldCycleMs(narrow)).toBe((narrow / depthDrift.pxPerSecond) * 1000);
    expect(depthFieldCycleMs(wide) / depthFieldCycleMs(narrow)).toBeCloseTo(3);
  });

  it('closes the cycle exactly on the tile, with no jump', () => {
    const tile = depthFieldTileHeight(390);
    // The end of one loop and the start of the next are the same offset, so
    // the wrap shows the pixels it left.
    // (Whole multiples land on 0 or on the tile itself depending on which side
    // of the float the remainder falls — the same pixels either way, which is
    // the property that matters. A sub-pixel is the tolerance.)
    const seam = (offset: number) => {
      const wrapped = wrapDepthOffset(offset, tile);
      return Math.min(wrapped, tile - wrapped);
    };
    expect(seam(tile)).toBeLessThan(0.001);
    expect(seam(tile * 3)).toBeLessThan(0.001);
    expect(seam(0)).toBe(0);
    // And nothing in between escapes the tile the renderers hang above the
    // column, in either direction.
    for (const offset of [-tile * 2.5, -1, 0, 0.5, tile - 0.5, tile * 7.25]) {
      const wrapped = wrapDepthOffset(offset, tile);
      expect(wrapped).toBeGreaterThanOrEqual(0);
      expect(wrapped).toBeLessThan(tile);
    }
  });

  it('adds the scroll to the drift instead of replacing it', () => {
    const tile = depthFieldTileHeight(390);
    const drift = tile * 0.25;
    const parallax = -600 * depthDrift.parallaxFactor;
    const still = wrapDepthOffset(drift, tile);
    const scrolled = wrapDepthOffset(drift + parallax, tile);
    // Scrolling moves the field off where the drift alone had it...
    expect(scrolled).not.toBe(still);
    // ...by exactly the parallax, folded into the tile — the drift's own
    // phase is still in there, not overwritten.
    expect(scrolled).toBeCloseTo(wrapDepthOffset(still + parallax, tile));
  });
});
