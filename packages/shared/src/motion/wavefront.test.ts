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
  WAVEFRONT_PASS_MS,
  WAVEFRONT_PERIOD_MS,
  WAVEFRONT_REST_MS,
  WAVEFRONT_RECOVER_MS,
  WAVEFRONT_SINK_MS,
  WAVEFRONT_TRAIN_CROSS_MS,
  WAVEFRONT_EBB_MS,
  WAVEFRONT_EXIT_SLACK_MS,
  planWavefront,
  planWavefrontExit,
  wavefrontCalmMs,
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

/**
 * `planWavefront` has no caller since the riders were removed (product,
 * 2026-08). It is tested anyway, and on purpose: what it encodes — `d/c` and
 * the 1/√d attenuation — is expensive to rediscover and product's own words on
 * the removal were *"al menos por ahora"*. An untested kept function is a
 * function that will not work when it comes back.
 */
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

  it('passes each element over `drift`, the same curve for everyone', () => {
    const near = planWavefront({ x: 190, y: 300 }, origin, bounds, false);
    const far = planWavefront({ x: 360, y: 600 }, origin, bounds, false);

    expect(near?.durationMs).toBe(motionMs.drift);
    expect(far?.durationMs).toBe(motionMs.drift);
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

describe('wavefrontExitMs — the hard upper bound', () => {
  it('bounds the handoff at the whole strike plus the closing ramp, with guard slack', () => {
    expect(wavefrontExitMs(false)).toBe(
      WAVEFRONT_SINK_MS + WAVEFRONT_TRAIN_CROSS_MS + WAVEFRONT_EBB_MS + WAVEFRONT_EXIT_SLACK_MS
    );
    // Spelled out because it is the dead time a caller pays for the crossing:
    // slowing the front slows the receipt one for one. See WAVEFRONT_CROSS_MS.
    expect(wavefrontExitMs(false)).toBe(2700);
  });

  it('closes on the sink half of the verb, not the generic-UI ebb', () => {
    // DESIGN.md §Motion: the wait's exit is 360 — tide/2, the same length the
    // sink-and-float verb gives every departure in this water.
    expect(WAVEFRONT_EBB_MS).toBe(motionMs.tide / 2);
    expect(WAVEFRONT_EBB_MS).toBe(360);
  });

  it('is never shorter than any exit the wave can actually plan', () => {
    // Sweep the whole period: the timer that guards against a dropped animation
    // callback may not fire before the animation it is guarding.
    for (let elapsed = 0; elapsed <= WAVEFRONT_PERIOD_MS * 3; elapsed += 17) {
      expect(planWavefrontExit(elapsed, false).exitMs).toBeLessThanOrEqual(wavefrontExitMs(false));
    }
  });

  it('does not make a reduce-motion user wait out a wave they cannot see', () => {
    expect(wavefrontExitMs(true)).toBe(motionMs.ebb + WAVEFRONT_EXIT_SLACK_MS);
    expect(wavefrontExitMs(true)).toBeLessThan(wavefrontExitMs(false));
  });

  it('always leaves the guard real headroom over the animated exit', () => {
    // The guard is armed on the JS clock against a UI-thread animation: an
    // exact tie is a race, and the guard losing it cuts the exit's last
    // frames. Slack must be genuine, at every phase.
    for (let elapsed = 0; elapsed <= WAVEFRONT_PERIOD_MS * 2; elapsed += 17) {
      expect(
        planWavefrontExit(elapsed, false).exitMs + WAVEFRONT_EXIT_SLACK_MS
      ).toBeLessThanOrEqual(wavefrontExitMs(false));
    }
    expect(planWavefrontExit(0, true).exitMs + WAVEFRONT_EXIT_SLACK_MS).toBeLessThanOrEqual(
      wavefrontExitMs(true)
    );
  });
});

/**
 * The exit, which is now *derived from where the front is* rather than a
 * constant. Product, 2026-08: the next screen may not appear until the last
 * wave has left — *"justo cuando el agua está calma. Esto aplica siempre."*
 */
describe('planWavefrontExit — hand off on calm water', () => {
  it('waits out the whole train when the work resolves at the impact', () => {
    expect(planWavefrontExit(WAVEFRONT_SINK_MS, false)).toEqual({
      holdMs: WAVEFRONT_TRAIN_CROSS_MS,
      exitMs: WAVEFRONT_TRAIN_CROSS_MS + WAVEFRONT_EBB_MS,
    });
  });

  it('holds through the strike a descending mark has already committed to', () => {
    // Nothing is cancelled on exit: a mark on its way down will hit the water
    // and its front will cross. Handing off mid-descent used to emit a fresh
    // wave under the closing ebb and cut it — the last front must leave the
    // viewport first (owner, 2026-08, on device).
    expect(planWavefrontExit(WAVEFRONT_SINK_MS - 1, false)).toEqual({
      holdMs: WAVEFRONT_TRAIN_CROSS_MS + 1,
      exitMs: WAVEFRONT_TRAIN_CROSS_MS + 1 + WAVEFRONT_EBB_MS,
    });
  });

  it('waits only for what the front has left to travel', () => {
    const { holdMs } = planWavefrontExit(WAVEFRONT_SINK_MS + WAVEFRONT_CROSS_MS / 4, false);

    expect(holdMs).toBe(WAVEFRONT_CROSS_MS * 0.75);
  });

  it('hands off immediately when the water is already calm', () => {
    // Anywhere in the rest between two emissions there is nothing on screen to
    // wait for, and inventing a closing wave would be pure latency.
    const midRest = WAVEFRONT_SINK_MS + WAVEFRONT_CROSS_MS + WAVEFRONT_REST_MS / 2;

    expect(planWavefrontExit(midRest, false)).toEqual({ holdMs: 0, exitMs: WAVEFRONT_EBB_MS });
  });

  it('reads the same on the tenth emission as on the first', () => {
    const first = planWavefrontExit(300, false);
    const tenth = planWavefrontExit(WAVEFRONT_PERIOD_MS * 10 + 300, false);

    expect(tenth).toEqual(first);
  });

  it('never lets the hold outlive the front it is waiting for', () => {
    for (let elapsed = 0; elapsed <= WAVEFRONT_PERIOD_MS * 2; elapsed += 13) {
      const { holdMs } = planWavefrontExit(elapsed, false);
      expect(holdMs).toBeGreaterThanOrEqual(0);
      expect(holdMs).toBeLessThanOrEqual(WAVEFRONT_SINK_MS + WAVEFRONT_TRAIN_CROSS_MS);
    }
  });

  it('keeps the short path for reduce motion, at every phase', () => {
    for (let elapsed = 0; elapsed <= WAVEFRONT_PERIOD_MS; elapsed += 37) {
      expect(planWavefrontExit(elapsed, true)).toEqual({ holdMs: 0, exitMs: motionMs.ebb });
    }
  });

  it('maps a negative elapsed time to the top of the descent, never a negative wait', () => {
    // Phase 0 is the top of the sink: the strike and the whole train are
    // still ahead, so the hold is the full strike — a caller whose loop truly
    // has not started cancels it and passes the calm flag instead.
    expect(planWavefrontExit(-1, false).holdMs).toBe(WAVEFRONT_SINK_MS + WAVEFRONT_TRAIN_CROSS_MS);
  });
});

describe('the loop keeps one front in flight at a time', () => {
  it('leaves still water between the front leaving and the next emission', () => {
    expect(WAVEFRONT_PERIOD_MS).toBe(WAVEFRONT_CROSS_MS + WAVEFRONT_REST_MS);
    expect(WAVEFRONT_REST_MS).toBeGreaterThan(0);
  });

  it('gives a pass time to be carried rather than flicked', () => {
    expect(WAVEFRONT_PASS_MS).toBeLessThan(WAVEFRONT_CROSS_MS);
  });
});

/**
 * The rhythm product asked for by eye — *"the next sink lands as the previous
 * wave leaves the screen"* — asserted as arithmetic, because it is already
 * implicit in the constants and a hardcoded gap would silently stop matching
 * the crossing the first time the crossing moved.
 */
describe('the mark sinks, and the front is born at the trough', () => {
  it('leaves exactly the rest between the front clearing and the next impact', () => {
    expect(wavefrontCalmMs()).toBe(WAVEFRONT_REST_MS);
  });

  it('keeps the impact quick and the recovery slow, with the recovery inside the period', () => {
    expect(WAVEFRONT_SINK_MS).toBeLessThan(WAVEFRONT_RECOVER_MS);
    expect(WAVEFRONT_SINK_MS + WAVEFRONT_RECOVER_MS).toBeLessThan(WAVEFRONT_PERIOD_MS);
  });

  it('emits inside the period, so two fronts are never in flight at once', () => {
    expect(WAVEFRONT_SINK_MS + WAVEFRONT_CROSS_MS).toBeLessThan(WAVEFRONT_PERIOD_MS);
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
