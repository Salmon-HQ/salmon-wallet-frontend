import { describe, expect, it } from 'vitest';

import { depthFieldTile, marineSnow, marineSnowSvg } from './depthField';
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
    for (const [, , , , opacity] of marineSnow) {
      expect(opacity).toBeGreaterThanOrEqual(0.05);
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
  const near = marineSnow.filter(([, , rx]) => rx >= 2.9);
  const far = marineSnow.filter(([, , rx]) => rx < 1.8);

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

describe('marine snow: the serialised field', () => {
  it('renders every floc, and only in the token colour', () => {
    const svg = marineSnowSvg(water.snow);
    expect(svg.match(/<ellipse/g)).toHaveLength(marineSnow.length);
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
