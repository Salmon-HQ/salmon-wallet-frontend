/**
 * The verb's numbers, pinned to their derivations and to the bands DESIGN.md
 * records for them. A token change that would silently move the verb off the
 * water's clock fails here rather than on a device.
 */
import { describe, expect, it } from 'vitest';

import { motionMs } from '../theme/durations';
import {
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
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
    expect(SINK_FLOAT_TRAVEL).toBeGreaterThanOrEqual(24);
    expect(SINK_FLOAT_TRAVEL).toBeLessThanOrEqual(40);
    expect(FLOAT_IN_MS).toBeGreaterThanOrEqual(450);
    expect(FLOAT_IN_MS).toBeLessThanOrEqual(650);
    expect(SINK_OUT_MS).toBeGreaterThanOrEqual(320);
    expect(SINK_OUT_MS).toBeLessThanOrEqual(400);
    expect(FLOAT_ENTER_SCALE).toBeGreaterThan(0.95);
    expect(FLOAT_ENTER_SCALE).toBeLessThan(1);
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
