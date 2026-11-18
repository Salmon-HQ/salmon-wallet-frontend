import { describe, it, expect } from 'vitest';
import { createScalers, DESIGN_HEIGHT, DESIGN_WIDTH } from './scalingCore';

describe('createScalers', () => {
  it('is the identity on the design device', () => {
    const { s, vs, ms, mvs } = createScalers(() => ({
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
    }));
    expect([s(24), vs(60), ms(14), mvs(14)]).toEqual([24, 60, 14, 14]);
  });

  it('scales each axis by its own ratio and dampens the moderate ones', () => {
    const { s, vs, ms, mvs } = createScalers(() => ({ width: 220, height: 478 }));
    expect(s(24)).toBe(12);
    expect(vs(60)).toBe(30);
    expect(ms(16)).toBe(12); // half of the way from 16 down to 8
    expect(ms(16, 0)).toBe(16);
    expect(ms(16, 1)).toBe(8);
    expect(mvs(16)).toBe(12);
  });

  it('reads the dimensions on every call, so a late viewport is picked up', () => {
    let width = DESIGN_WIDTH;
    const { s } = createScalers(() => ({ width, height: DESIGN_HEIGHT }));
    expect(s(10)).toBe(10);
    width = 220;
    expect(s(10)).toBe(5);
  });
});
