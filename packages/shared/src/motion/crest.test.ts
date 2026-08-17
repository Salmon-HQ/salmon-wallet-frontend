/**
 * The crest's shape, tested as arithmetic.
 *
 * The claim this paint rests on is one sentence: **across the thickness of the
 * band the inner face is light and the outer face is shadow.** That is what
 * makes the front read as a raised ridge of water rather than as a circle drawn
 * around a region, and it is a property of the stop *order*, not of the colours
 * anyone picks. If a future tuning pass inverts it, the front silently becomes a
 * dent instead of a crest and nothing else in the system would notice.
 */
import { describe, expect, it } from 'vitest';

import {
  CREST_BAND,
  CREST_DECAY,
  CREST_LIGHT_ALPHA,
  CREST_LIGHT_COLOR,
  CREST_SHADOW_ALPHA,
  CREST_SHADOW_COLOR,
  crestGradientCSS,
  crestStops,
  crestTrain,
} from './crest';

describe('crestStops — light inside, shadow outside', () => {
  const stops = crestStops();

  it('puts the lit face nearer the origin than the shaded one', () => {
    const light = stops.find((stop) => stop.color === CREST_LIGHT_COLOR && stop.opacity > 0)!;
    const shadow = stops.find((stop) => stop.color === CREST_SHADOW_COLOR && stop.opacity > 0)!;

    expect(light.offset).toBeLessThan(shadow.offset);
  });

  it('fades to nothing at both feet, so the band is a ridge and not a disc', () => {
    expect(stops[0].opacity).toBe(0);
    expect(stops[stops.length - 1].opacity).toBe(0);
    expect(stops[stops.length - 1].offset).toBe(1);
  });

  it('keeps the whole band inside the front, one band thickness wide', () => {
    expect(stops[0].offset).toBeCloseTo(1 - CREST_BAND, 10);
    // A ridge, not a glow: the research bar is a band under ~10% of the radius.
    expect(CREST_BAND).toBeLessThan(0.1);
  });

  it('keeps the stops in ascending order — a gradient cannot go backwards', () => {
    const offsets = stops.map((stop) => stop.offset);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });

  it('dims the whole profile together, so a trailing crest is the same shape', () => {
    const dim = crestStops(0.5);

    expect(dim[1].opacity).toBeCloseTo(CREST_LIGHT_ALPHA * 0.5, 10);
    expect(dim[2].opacity).toBeCloseTo(CREST_SHADOW_ALPHA * 0.5, 10);
    expect(dim.map((stop) => stop.offset)).toEqual(stops.map((stop) => stop.offset));
  });
});

describe('crestTrain — a wave train, not one pulse', () => {
  const train = crestTrain();

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
    const stops = crestStops();

    expect(css).toContain('circle closest-side');
    stops.forEach((stop) => {
      expect(css).toContain(`${(stop.offset * 100).toFixed(2)}%`);
    });
  });

  it('emits the light before the shadow, in the order a browser reads them', () => {
    const css = crestGradientCSS();
    // salmon-500 as rgb, and black.
    expect(css.indexOf('255, 92, 69')).toBeLessThan(css.lastIndexOf('0, 0, 0'));
  });
});
