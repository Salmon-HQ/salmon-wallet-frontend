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
 * The second is the **exclusion envelope**: the field has to be spent before
 * the ground reaches a data row. That is The Scales Exclusion Rule applied to
 * this motif, and it is a property an edit that only "added a few particles
 * lower down" would destroy without any renderer noticing.
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

describe('marine snow: the exclusion envelope', () => {
  const { height } = depthFieldTile;

  it('draws nothing in the bottom tenth of the field', () => {
    const lowest = Math.max(...marineSnow.map(([, cy, , ry]) => cy + ry));
    expect(lowest).toBeLessThan(height * 0.9);
  });

  it('fades out rather than stopping at an edge', () => {
    // Whatever survives in the lower third has to be near-invisible, or the
    // field ends on a line instead of dissolving.
    const deep = marineSnow.filter(([, cy]) => cy > height * 0.75);
    expect(deep.length).toBeGreaterThan(0);
    for (const [, , , , opacity] of deep) {
      expect(opacity).toBeLessThanOrEqual(0.25);
    }
  });

  it('is wider than the widest column it has to cover', () => {
    // `componentSizes.webContainerMaxWidth` is 430; a narrower field would
    // leave a bare strip at the edge of a phone-width column.
    expect(depthFieldTile.width).toBeGreaterThanOrEqual(430);
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
