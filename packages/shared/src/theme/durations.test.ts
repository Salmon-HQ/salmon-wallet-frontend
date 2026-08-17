import { describe, expect, it } from 'vitest';

import {
  duration,
  durationMs,
  easing,
  motionDuration,
  motionEasing,
  motionMs,
  reducedMotion,
  resolveMotionDuration,
  resolveMotionMs,
} from './durations';

describe('motion vocabulary', () => {
  it('keeps the CSS strings and the millisecond values in step', () => {
    for (const key of Object.keys(motionDuration) as Array<keyof typeof motionDuration>) {
      expect(motionDuration[key]).toBe(`${motionMs[key]}ms`);
    }
  });

  it('exits faster than it enters', () => {
    expect(motionMs.ebb).toBeLessThan(motionMs.drift);
  });

  it('ships every curve for both platforms, with matching coefficients', () => {
    for (const curve of Object.values(motionEasing)) {
      expect(curve.native).toHaveLength(4);
      expect(curve.css).toBe(`cubic-bezier(${curve.native.join(', ')})`);
    }
  });

  it('keeps overshoot subtle — no rubber-ball curves', () => {
    for (const curve of Object.values(motionEasing)) {
      for (const coefficient of curve.native) {
        expect(coefficient).toBeLessThanOrEqual(1.15);
      }
    }
  });
});

describe('resolveMotionMs / resolveMotionDuration', () => {
  it('passes travel through untouched when reduce motion is off', () => {
    expect(resolveMotionMs(motionMs.rise, false)).toBe(motionMs.rise);
    expect(resolveMotionDuration(motionDuration.rise, false)).toBe(motionDuration.rise);
  });

  it('drops travel when reduce motion is on', () => {
    expect(resolveMotionMs(motionMs.rise, true)).toBe(reducedMotion.ms);
    expect(resolveMotionDuration(motionDuration.rise, true)).toBe(reducedMotion.css);
  });

  it('substitutes a non-zero CSS duration so transitionend still fires', () => {
    expect(Number.parseFloat(reducedMotion.css)).toBeGreaterThan(0);
  });
});

describe('legacy tokens', () => {
  it('resolves copy confirmation to a single hold', () => {
    expect(durationMs.feedbackShort).toBe(motionMs.feedbackHold);
    expect(durationMs.feedbackLong).toBe(motionMs.feedbackHold);
  });

  it('still exposes every previously shipped key', () => {
    const durationKeys = [
      'fastest',
      'fast',
      'normal',
      'medium',
      'slow',
      'slower',
      'stagger1',
      'stagger2',
      'stagger3',
    ];
    const durationMsKeys = [
      'normal',
      'medium',
      'slow',
      'slower',
      'debounce',
      'spin',
      'pulse',
      'feedbackShort',
      'shimmer',
      'feedbackLong',
      'spinSlow',
    ];
    const easingKeys = ['ease', 'easeOut', 'easeIn', 'easeInOut', 'standard', 'slide', 'bounce'];

    expect(Object.keys(duration)).toEqual(durationKeys);
    expect(Object.keys(durationMs)).toEqual(durationMsKeys);
    expect(Object.keys(easing)).toEqual(easingKeys);
  });

  it('keeps every legacy value usable where it is used', () => {
    for (const value of Object.values(duration)) {
      expect(value).toMatch(/^\d+(\.\d+)?ms$/);
    }
    for (const value of Object.values(durationMs)) {
      expect(Number.isFinite(value)).toBe(true);
    }
    for (const value of Object.values(easing)) {
      expect(value).toMatch(/^cubic-bezier\(/);
    }
  });
});
