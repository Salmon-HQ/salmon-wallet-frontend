import { describe, expect, it } from 'vitest';

import {
  depthFieldTile,
  depthRamp,
  depthRampOpacity,
  marineSnow,
  marineSnowTiled,
} from './depthField';
import {
  blizzard,
  blizzardClusterCenters,
  blizzardHeroes,
  blizzardMidFlocs,
  blizzardSnow,
  blizzardSnowSvg,
  blizzardSnowTiled,
} from './depthFieldBlizzard';
import { water } from './semantic';

/**
 * The blizzard variant's safety properties.
 *
 * The load-bearing one is that the tuning did not repeal the law: every
 * added floc — heroes included — still gets its opacity from its own size
 * through the one-distance ramp (projective size, Beer–Lambert veiling,
 * clamped at the token for `z < 1`). The rest pin the budget (a moderate
 * lift, not ×3), the hero quota, the clustering, and that nothing is
 * randomised between runs.
 */

const ROUNDING = 0.01;

describe('blizzard: the one-distance law survives the tuning', () => {
  it('gives every added floc the opacity its own size implies', () => {
    for (const [, , rx, , opacity] of blizzardMidFlocs) {
      const law = Math.min(1, depthRampOpacity(depthRamp.rxNear / rx));
      expect(Math.abs(opacity - law)).toBeLessThanOrEqual(ROUNDING + 1e-9);
    }
  });

  it('gives every hero the opacity its own size implies — the clamped near end', () => {
    for (const [, , rx, , opacity] of blizzardHeroes) {
      const law = Math.min(1, depthRampOpacity(depthRamp.rxNear / rx));
      expect(Math.abs(opacity - law)).toBeLessThanOrEqual(ROUNDING + 1e-9);
    }
  });

  it('caps every peak opacity at the token, heroes included', () => {
    for (const [, , , , opacity] of [...blizzardSnow, ...blizzardHeroes]) {
      expect(opacity).toBeLessThanOrEqual(1);
      expect(opacity).toBeGreaterThanOrEqual(depthRamp.opacityFar - 1e-9);
    }
  });

  it('never draws a larger floc fainter than a smaller one, across the whole field', () => {
    const all = [...blizzardSnow, ...blizzardHeroes];
    for (const [, , rxA, , opacityA] of all) {
      for (const [, , rxB, , opacityB] of all) {
        if (rxA > rxB + ROUNDING) {
          expect(opacityA).toBeGreaterThanOrEqual(opacityB - ROUNDING);
        }
      }
    }
  });
});

describe('blizzard: the near field exists, on budget', () => {
  it('keeps the base field untouched underneath', () => {
    expect(blizzardSnow.slice(0, marineSnow.length)).toEqual(marineSnow);
    expect(blizzardSnowTiled.slice(0, marineSnowTiled.length)).toEqual(marineSnowTiled);
  });

  it('lifts the mid field moderately — nowhere near tripling the count', () => {
    const total = blizzardSnow.length + blizzardHeroes.length;
    expect(total).toBeGreaterThan(marineSnow.length);
    expect(total).toBeLessThan(marineSnow.length * 1.6);
  });

  it('draws the hero quota, one per band down the tile', () => {
    expect(blizzardHeroes.length).toBe(blizzard.heroCount);
    const band = depthFieldTile.height / blizzard.heroCount;
    blizzardHeroes.forEach(([, cy], i) => {
      expect(cy).toBeGreaterThanOrEqual(band * i);
      expect(cy).toBeLessThanOrEqual(band * (i + 1));
    });
  });

  it('sizes the heroes past the old near plane — that is the extended range', () => {
    for (const [, , rx] of blizzardHeroes) {
      expect(rx).toBeGreaterThan(depthRamp.rxNear);
      expect(rx).toBeGreaterThanOrEqual(depthRamp.rxNear / blizzard.heroZFar - ROUNDING);
      expect(rx).toBeLessThanOrEqual(depthRamp.rxNear / blizzard.heroZNear + ROUNDING);
    }
  });

  it('ships elongation off — a streak must be opted into, on a device', () => {
    expect(blizzard.heroElongation).toBe(0);
  });

  it('keeps every added floc and hero clear of every tile edge', () => {
    const { width: W, height: H } = depthFieldTile;
    for (const [cx, cy, rx, ry] of [...blizzardMidFlocs, ...blizzardHeroes]) {
      expect(cx - rx).toBeGreaterThanOrEqual(0);
      expect(cx + rx).toBeLessThanOrEqual(W);
      expect(cy - ry).toBeGreaterThanOrEqual(0);
      expect(cy + ry).toBeLessThanOrEqual(H);
    }
  });
});

describe('blizzard: the added density arrives in patches', () => {
  it('pools most added flocs within two patch radii of a cluster centre', () => {
    const near = blizzardMidFlocs.filter(([cx, cy]) =>
      blizzardClusterCenters.some(
        ([px, py]) => Math.hypot(cx - px, cy - py) <= 2 * blizzard.clusterRadius
      )
    );
    // clusterIntensity of the flocs are aimed at a patch; the Gaussian tail
    // and the clamp leak a few, so the floor is set below the aim.
    expect(near.length / blizzardMidFlocs.length).toBeGreaterThanOrEqual(
      blizzard.clusterIntensity * 0.8
    );
  });
});

describe('blizzard: the serialised field', () => {
  it('renders every floc and hero, heroes on the soft radial fill', () => {
    const svg = blizzardSnowSvg(water.snow);
    expect(svg.match(/<ellipse/g)).toHaveLength(blizzardSnowTiled.length + blizzardHeroes.length);
    expect(svg).toContain('<radialGradient');
    expect(svg.match(/url\(#/g)).toHaveLength(blizzardHeroes.length);
    expect(svg).toContain(`fill="${water.snow}"`);
  });

  it('is a constant — nothing is randomised at render time', () => {
    expect(blizzardSnowSvg(water.snow)).toBe(blizzardSnowSvg(water.snow));
  });
});
