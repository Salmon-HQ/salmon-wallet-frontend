/**
 * The wave's arithmetic, tested without a renderer or a frame clock.
 *
 * What matters here is not that numbers come out, but that the three claims the
 * choreography rests on hold: the delay is proportional to distance (that is
 * what makes it a front rather than a stagger), the amplitude falls off with
 * distance (that is what makes it read as one wave), and the exit is a fixed
 * duration a caller can hand off against.
 */
import { describe, expect, it } from 'vitest';

import { motionMs } from '../theme/durations';
import { componentSizes } from '../theme/spacing';
import {
  WAVEFRONT_CROSS_MS,
  WAVEFRONT_MIN_AMPLITUDE,
  planWavefront,
  wavefrontExitMs,
  wavefrontRadius,
} from './wavefront';

const bounds = { width: 360, height: 600 };
const origin = { x: 180, y: 300 };

describe('wavefrontRadius', () => {
  it('reaches the farthest corner, so the front always crosses in one window', () => {
    expect(wavefrontRadius(origin, bounds)).toBeCloseTo(Math.hypot(180, 300));
  });

  it('measures from the far side when the origin is off-centre', () => {
    expect(wavefrontRadius({ x: 0, y: 0 }, bounds)).toBeCloseTo(Math.hypot(360, 600));
  });
});

describe('planWavefront — delay is distance', () => {
  it('starts the passenger at the origin immediately', () => {
    const plan = planWavefront(origin, origin, bounds, false);

    expect(plan?.delayMs).toBe(0);
  });

  it('starts the farthest corner exactly one crossing later', () => {
    const plan = planWavefront({ x: 360, y: 600 }, origin, bounds, false);

    expect(plan?.delayMs).toBe(WAVEFRONT_CROSS_MS);
  });

  it('delays in proportion to distance, which is what makes it a front', () => {
    const rMax = wavefrontRadius(origin, bounds);
    const near = planWavefront({ x: 180, y: 300 + rMax / 4 }, origin, bounds, false);
    const far = planWavefront({ x: 180, y: 300 + rMax / 2 }, origin, bounds, false);

    expect(near?.delayMs).toBe(Math.round(WAVEFRONT_CROSS_MS / 4));
    expect(far?.delayMs).toBe(Math.round(WAVEFRONT_CROSS_MS / 2));
    // Twice the distance, twice the wait: f(t − d/c).
    expect(far!.delayMs).toBe(near!.delayMs * 2);
  });

  it('never delays a passenger beyond the crossing, however far outside it sits', () => {
    const plan = planWavefront({ x: 4000, y: 4000 }, origin, bounds, false);

    expect(plan?.delayMs).toBe(WAVEFRONT_CROSS_MS);
  });

  it('passes each element over `swell`, the same curve for everyone', () => {
    const near = planWavefront({ x: 190, y: 300 }, origin, bounds, false);
    const far = planWavefront({ x: 360, y: 600 }, origin, bounds, false);

    expect(near?.durationMs).toBe(motionMs.swell);
    expect(far?.durationMs).toBe(motionMs.swell);
  });
});

describe('planWavefront — amplitude is cylindrical attenuation', () => {
  it('gives the emitter the full token amplitude', () => {
    const plan = planWavefront(origin, origin, bounds, false);

    expect(plan?.amplitude).toBeCloseTo(componentSizes.waveAmplitude);
  });

  it('falls off monotonically with distance', () => {
    const rMax = wavefrontRadius(origin, bounds);
    const amplitudes = [0, 0.25, 0.5, 0.75, 1].map(
      (fraction) =>
        planWavefront({ x: 180, y: 300 + rMax * fraction }, origin, bounds, false)!.amplitude
    );

    for (let i = 1; i < amplitudes.length; i += 1) {
      expect(amplitudes[i]).toBeLessThan(amplitudes[i - 1]);
    }
  });

  it('matches 1/sqrt(1 + d/d0) at the far edge — the cylindrical law, not the spherical one', () => {
    const plan = planWavefront({ x: 360, y: 600 }, origin, bounds, false);

    // d = rMax, d0 = rMax/2, so the factor is 1/sqrt(3).
    expect(plan?.amplitude).toBeCloseTo(componentSizes.waveAmplitude / Math.sqrt(3));
  });

  it('never attenuates below a rendered pixel — a still passenger is a hole in the front', () => {
    const plan = planWavefront({ x: 100000, y: 100000 }, origin, { width: 4, height: 4 }, false);

    expect(plan!.amplitude).toBeGreaterThanOrEqual(WAVEFRONT_MIN_AMPLITUDE);
  });
});

describe('planWavefront — reduce motion', () => {
  it('plans nothing at all rather than a zero-length version of the motion', () => {
    expect(planWavefront({ x: 0, y: 0 }, origin, bounds, true)).toBeNull();
  });

  it('plans nothing when the surface has not been measured yet', () => {
    const unmeasured = { x: 0, y: 0 };

    expect(planWavefront(unmeasured, unmeasured, { width: 0, height: 0 }, false)).toBeNull();
  });
});

describe('wavefrontExitMs', () => {
  it('holds for one crossing plus an ebb, and never for a pulse cycle', () => {
    expect(wavefrontExitMs(false)).toBe(motionMs.rise + motionMs.ebb);
    expect(wavefrontExitMs(false)).toBe(600);
    expect(wavefrontExitMs(false)).toBeLessThan(motionMs.pulseCycle);
  });

  it('does not make a reduce-motion user wait out a wave they cannot see', () => {
    expect(wavefrontExitMs(true)).toBe(motionMs.ebb);
    expect(wavefrontExitMs(true)).toBeLessThan(wavefrontExitMs(false));
  });

  it('stays under the one-second ceiling for an uninterrupted flow of thought', () => {
    expect(wavefrontExitMs(false)).toBeLessThanOrEqual(1000);
  });
});
