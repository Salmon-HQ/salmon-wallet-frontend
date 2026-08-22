/**
 * The verb's numbers, pinned to their derivations and to the bands DESIGN.md
 * records for them. A token change that would silently move the verb off the
 * water's clock fails here rather than on a device.
 */
import { describe, expect, it } from 'vitest';

import { motionMs } from '../theme/durations';
import {
  CHROME_SCALE,
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_EXIT_SCALE,
  SINK_FLOAT_STAGGER_MS,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
} from './sinkFloat';

describe('the sink and the float', () => {
  it('derives its clock from the motion vocabulary, minting nothing new', () => {
    expect(FLOAT_IN_MS).toBe(motionMs.drift * 2);
    expect(SINK_OUT_MS).toBe(motionMs.tide / 2);
    expect(SINK_FLOAT_STAGGER_MS).toBe(motionMs.stagger);
  });

  it('keeps every number inside its recorded band', () => {
    expect(SINK_FLOAT_TRAVEL).toBeGreaterThanOrEqual(0);
    expect(SINK_FLOAT_TRAVEL).toBeLessThanOrEqual(10);
    expect(FLOAT_IN_MS).toBeGreaterThanOrEqual(450);
    expect(FLOAT_IN_MS).toBeLessThanOrEqual(650);
    expect(SINK_OUT_MS).toBeGreaterThanOrEqual(320);
    expect(SINK_OUT_MS).toBeLessThanOrEqual(400);
    for (const depth of [FLOAT_ENTER_SCALE, SINK_EXIT_SCALE]) {
      expect(depth).toBeGreaterThanOrEqual(0.88);
      expect(depth).toBeLessThanOrEqual(0.93);
    }
    expect(CHROME_SCALE).toBeGreaterThanOrEqual(0.93);
    expect(CHROME_SCALE).toBeLessThanOrEqual(0.97);
  });

  it('reads as depth rather than as a slide: scale carries the Z, travel accents it', () => {
    // The regression this pins is the verb's first shape — 28dp of travel and
    // no recession on the exit at all, which read as content sliding off a
    // shelf. Both halves must now recede, and the travel must stay small
    // enough that it cannot out-speak them.
    expect(SINK_EXIT_SCALE).toBeLessThan(1);
    expect(FLOAT_ENTER_SCALE).toBeLessThan(1);
    expect(SINK_FLOAT_TRAVEL).toBeLessThan(12);
  });

  it('mirrors the two halves on one Z axis — arriving undoes exactly what left', () => {
    expect(FLOAT_ENTER_SCALE).toBe(SINK_EXIT_SCALE);
  });

  it('gives chrome half the depth of content, not half the travel', () => {
    // The old rule (`SINK_FLOAT_TRAVEL / 2`) survives as the accent, but the
    // depth is what carries the verb now, so that is what halves.
    expect(1 - CHROME_SCALE).toBeCloseTo((1 - SINK_EXIT_SCALE) / 2, 10);
    expect(CHROME_SCALE).toBeGreaterThan(SINK_EXIT_SCALE);
  });

  it('waits out the whole sink plus a beat before the float', () => {
    const beat = FLOAT_DELAY_MS - SINK_OUT_MS;
    expect(beat).toBeGreaterThanOrEqual(90);
    expect(beat).toBeLessThanOrEqual(120);
  });

  it('leaves faster than it arrives', () => {
    expect(SINK_OUT_MS).toBeLessThan(FLOAT_IN_MS);
  });
});
