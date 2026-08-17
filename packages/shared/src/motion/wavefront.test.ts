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

/**
 * The recentring, checked as arithmetic rather than by eye.
 *
 * The origin moved from roughly a third of the way down the screen to its exact
 * centre (product, 2026-08). That changes every number the front is built from,
 * so the property the choreography actually rests on is re-asserted at the new
 * geometry: further away must never mean earlier.
 */
describe('planWavefront — the emitter at the centre of the surface', () => {
  // iPhone 17 logical points, and the emitter dead centre of them.
  const phone = { width: 402, height: 874 };
  const centre = { x: phone.width / 2, y: phone.height / 2 };

  /** The riders, in the order they now sit under the mark. */
  const riders = [
    { name: 'title', point: { x: centre.x, y: centre.y + 92 } },
    { name: 'subtitle', point: { x: centre.x, y: centre.y + 128 } },
    { name: 'tips', point: { x: centre.x, y: phone.height - 96 } },
  ];

  it('delays every rider monotonically in its distance from the centre', () => {
    const planned = riders.map(({ name, point }) => ({
      name,
      distance: Math.hypot(point.x - centre.x, point.y - centre.y),
      plan: planWavefront(point, centre, phone, false),
    }));

    // The riders are listed in increasing distance, and the delays must agree.
    for (let index = 1; index < planned.length; index += 1) {
      expect(planned[index].distance).toBeGreaterThan(planned[index - 1].distance);
      expect(planned[index].plan!.delayMs).toBeGreaterThan(planned[index - 1].plan!.delayMs);
      // And the amplitude goes the other way: further is smaller.
      expect(planned[index].plan!.amplitude).toBeLessThan(planned[index - 1].plan!.amplitude);
    }
  });

  it('reaches all four corners at the same moment, which only a centred origin does', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: phone.width, y: 0 },
      { x: 0, y: phone.height },
      { x: phone.width, y: phone.height },
    ];

    const delays = corners.map((corner) => planWavefront(corner, centre, phone, false)!.delayMs);

    expect(new Set(delays).size).toBe(1);
    expect(delays[0]).toBe(WAVEFRONT_CROSS_MS);
  });

  it('never delays a nearer rider longer than a farther one, anywhere on the surface', () => {
    // A grid sweep rather than three hand-picked points: monotonicity is the
    // claim, so it is checked as one.
    const sampled = [];
    for (let x = 0; x <= phone.width; x += 33) {
      for (let y = 0; y <= phone.height; y += 33) {
        sampled.push({
          distance: Math.hypot(x - centre.x, y - centre.y),
          delayMs: planWavefront({ x, y }, centre, phone, false)!.delayMs,
        });
      }
    }
    sampled.sort((a, b) => a.distance - b.distance);

    for (let index = 1; index < sampled.length; index += 1) {
      expect(sampled[index].delayMs).toBeGreaterThanOrEqual(sampled[index - 1].delayMs);
    }
  });
});
