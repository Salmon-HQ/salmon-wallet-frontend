/**
 * The train's shape, tested as arithmetic.
 *
 * The claim this paint rests on is one sentence: **thin rings alternate lit and
 * shadowed, strongest at the inside and fading outward.** That is what makes
 * the front read as water rather than as a hoop drawn around a region, and it is
 * a property of the stop *order* and the stop *amplitudes*, not of the colours
 * anyone picks. If a future tuning pass inverts the alternation the front
 * silently becomes a groove, and if it flattens the decay the paint stops
 * agreeing with the 1/√d attenuation the riders are already using — and nothing
 * else in the system would notice either.
 *
 * The ancestors of the first two tests asserted a single asymmetric ridge (lit
 * stop at a smaller radius than the shaded one) and then a single symmetric
 * crown. They are rewritten rather than deleted each time, because the job they
 * were doing — stop the relief being turned inside out by a tuning pass — is
 * still the job.
 */
import { describe, expect, it } from 'vitest';

import {
  CREST_BAND,
  CREST_DECAY,
  CREST_LIFT_ALPHA,
  CREST_LIGHT_ALPHA,
  CREST_LIGHT_COLOR,
  CREST_RINGS,
  CREST_RING_DECAY,
  CREST_SHADOW_ALPHA,
  CREST_SHADOW_COLOR,
  crestGradientCSS,
  crestLineWidth,
  crestStops,
  crestTrain,
} from './crest';

/** `#rrggbb` as the `r, g, b` triple `crestGradientCSS` emits. */
function rgbOf(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

/** Rec. 709 relative luminance of a `#rrggbb`, 0–255. */
function luminance(hex: string): number {
  const value = parseInt(hex.slice(1), 16);
  return 0.2126 * ((value >> 16) & 255) + 0.7152 * ((value >> 8) & 255) + 0.0722 * (value & 255);
}

const stops = crestStops();
/** The lines — the lit crowns and the shadow lines, without the calm lift. */
const lines = stops.filter((stop) => stop.role === 'crown' || stop.role === 'shadow');
const crowns = lines.filter((stop) => stop.role === 'crown');
const shadows = lines.filter((stop) => stop.role === 'shadow');

describe('crestStops — a wave train, not one band', () => {
  it('carries one lit ring per CREST_RINGS, with a shadow line at every boundary but the innermost', () => {
    // The train starts on a crown: the innermost boundary has calm water
    // inside it and no lit line to be darker than, so its flank read as a
    // stray grey line on the pale ground (owner, 2026-09-02).
    expect(crowns).toHaveLength(CREST_RINGS);
    expect(shadows).toHaveLength(CREST_RINGS);
  });

  it('alternates lit and shadowed along the radius', () => {
    // The whole reason the shadows read on a ground with 16 levels beneath it:
    // a dark line is seen as shadow because it sits against a light one.
    const colours = lines.map((stop) => stop.color);
    for (let index = 1; index < colours.length; index += 1) {
      expect(colours[index]).not.toBe(colours[index - 1]);
    }
    expect(colours[0]).toBe(CREST_LIGHT_COLOR);
    expect(colours[colours.length - 1]).toBe(CREST_SHADOW_COLOR);
  });

  it('puts a shadow line outside every lit crown, and one inside every crown but the first', () => {
    crowns.forEach((crown, index) => {
      const inner = shadows.filter((shadow) => shadow.offset < crown.offset);
      const outer = shadows.filter((shadow) => shadow.offset > crown.offset);
      expect(inner.length).toBe(index);
      expect(outer.length).toBeGreaterThan(0);
    });
  });

  it('shades every flank darker than the crown it brackets — a ridge, not a groove', () => {
    expect(luminance(CREST_SHADOW_COLOR)).toBeLessThan(luminance(CREST_LIGHT_COLOR));
    shadows.forEach((shadow) => expect(shadow.opacity).toBeGreaterThan(0));
  });

  it('leads with the strongest ring and never gets stronger outward', () => {
    // The riders attenuate as 1/√d; the paint has to decay too, or the train
    // contradicts the motion it is supposed to be causing.
    for (let index = 1; index < crowns.length; index += 1) {
      expect(crowns[index].opacity).toBeLessThan(crowns[index - 1].opacity);
    }
    for (let index = 1; index < shadows.length; index += 1) {
      expect(shadows[index].opacity).toBeLessThanOrEqual(shadows[index - 1].opacity);
    }
    expect(crowns[0].opacity).toBeCloseTo(CREST_LIGHT_ALPHA, 10);
    expect(shadows[0].opacity).toBeCloseTo(CREST_SHADOW_ALPHA * CREST_RING_DECAY, 10);
    expect(crowns[1].opacity / crowns[0].opacity).toBeCloseTo(CREST_RING_DECAY, 10);
  });

  it('keeps the rings line-weight rather than tube-weight', () => {
    // A thin bright line with calm water either side is what the reference
    // photographs show; a uniformly thick opaque band is the rope reading
    // product rejected.
    const spacing = CREST_BAND / CREST_RINGS;
    expect(crestLineWidth()).toBeLessThan(spacing / 3);
    expect(crestLineWidth()).toBeLessThan(0.03);
  });

  it('lifts the calm water between the lines, so the shadows have somewhere to descend from', () => {
    // The ground is #0B0F19 — luminance 16 of 255 — so a shadow has 16 levels
    // of range below it and a crown has 240 above. Without the lift the profile
    // cannot be balanced and the paint reads as a bright rope.
    const lifts = stops.filter((stop) => stop.role === 'lift');

    // Two lifts per line, plus the pair that still brackets the innermost
    // boundary — the flank went, the calm around it stayed.
    expect(lifts).toHaveLength(2 * (lines.length + 1));
    expect(CREST_LIFT_ALPHA).toBeLessThan(CREST_LIGHT_ALPHA);
    // And every crown outshines the calm water it sits in, at every ring — a
    // crown dimmer than its own lift would be a groove, not a crest.
    crowns.forEach((crown) => {
      const beside = lifts.filter((stop) => Math.abs(stop.offset - crown.offset) < 0.02);
      beside.forEach((stop) => expect(stop.opacity).toBeLessThan(crown.opacity));
    });
  });

  it('fades to nothing at both feet, so the train ends', () => {
    // Past its last stop a radial gradient extends that stop's colour outward
    // forever: a near-opaque shadow on offset 1 would black out the screen.
    expect(stops[0].opacity).toBe(0);
    expect(stops[stops.length - 1].opacity).toBe(0);
    expect(stops[stops.length - 1].offset).toBe(1);
  });

  it('keeps the whole train inside the front, one band thickness wide', () => {
    expect(stops[0].offset).toBeCloseTo(1 - CREST_BAND, 10);
    expect(CREST_BAND).toBeLessThan(0.5);
  });

  it('keeps the stops in ascending order — a gradient cannot go backwards', () => {
    const offsets = stops.map((stop) => stop.offset);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });

  it('dims the whole profile together, so a trailing crest is the same shape', () => {
    const dim = crestStops(0.5);

    stops.forEach((stop, index) => {
      expect(dim[index].opacity).toBeCloseTo(stop.opacity * 0.5, 10);
    });
    expect(dim.map((stop) => stop.offset)).toEqual(stops.map((stop) => stop.offset));
  });
});

describe('crestTrain — one wave in flight at a time', () => {
  const train = crestTrain();

  it('keeps a single crest node alive, so the loop cannot read as a radar sweep', () => {
    // Product, 2026-08. The *rings* live inside that one node as gradient
    // stops — a wave train is more stops, not more nodes.
    expect(train).toHaveLength(1);
  });

  it('leads with a crest at full strength and no lag', () => {
    expect(train[0]).toEqual({ lag: 0, alpha: 1 });
  });

  it('runs each following crest further behind and dimmer than the last', () => {
    for (let index = 1; index < train.length; index += 1) {
      expect(train[index].lag).toBeGreaterThan(train[index - 1].lag);
      expect(train[index].alpha).toBeLessThan(train[index - 1].alpha);
      expect(train[index].alpha).toBeCloseTo(train[index - 1].alpha * CREST_DECAY, 10);
    }
  });

  it('keeps every crest inside one crossing — a crest still travelling when the next is emitted is two waves', () => {
    train.forEach(({ lag }) => expect(lag).toBeLessThan(1));
  });
});

describe('crestGradientCSS', () => {
  it('maps a stop offset straight onto its CSS percentage, so the two platforms agree', () => {
    const css = crestGradientCSS();

    expect(css).toContain('circle closest-side');
    stops.forEach((stop) => {
      expect(css).toContain(`${(stop.offset * 100).toFixed(2)}%`);
    });
  });

  it('brackets each lit crown with shadow, in the order a browser reads them', () => {
    const css = crestGradientCSS();
    // The crowns are located by their percentages: the light colour also paints
    // the calm lift, so colour alone no longer identifies a crown.
    const crownAt = crowns.map((crown) => css.indexOf(`${(crown.offset * 100).toFixed(2)}%`));

    crownAt.forEach((index) => expect(index).toBeGreaterThan(-1));
    // The train starts on a crown: the first shadow follows the first crown.
    expect(css.indexOf(rgbOf(CREST_SHADOW_COLOR))).toBeGreaterThan(crownAt[0]);
    expect(css.indexOf(rgbOf(CREST_SHADOW_COLOR))).toBeLessThan(crownAt[1]);
    expect(css.lastIndexOf(rgbOf(CREST_SHADOW_COLOR))).toBeGreaterThan(crownAt[crownAt.length - 1]);
  });
});
