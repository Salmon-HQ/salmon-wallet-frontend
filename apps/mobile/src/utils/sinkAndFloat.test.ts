/**
 * The sink-and-float contract. What matters is not the pixels but the
 * decisions that are easy to regress silently: the depth reading (both halves
 * recede on scale, and the travel stays a small accent so the swap never
 * relapses into a Y-slide), exit sinks *down* and enter floats *up* over the
 * same named distance, the durations are derived from the water's clock
 * (drift×2 in, tide/2 out — exit faster than enter), the light runs on its own
 * Beer–Lambert curve while the travel settles, and reduce motion gets no
 * layout animation at all — the swap stays a cut.
 */
import * as shared from '@salmon/shared';
import { motionEasing, motionMs } from '@salmon/shared';

// Reanimated pulls the Worklets native module, which does not exist under
// Jest. `withTiming` is stubbed to echo its arguments so the assertions can
// read the target and the duration the helper actually chose.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  withTiming: (toValue: unknown, config: unknown) => ({ toValue, config }),
  withDelay: (delayMs: number, animation: Record<string, unknown>) => ({ delayMs, ...animation }),
  Easing: {
    bezier: (...coefficients: number[]) => coefficients,
  },
}));

// The shared barrel reaches the Solana ESM packages, which this Jest config
// does not transform. Only the motion vocabulary matters here — the duration
// tokens and the verb's own constants — and both are the real modules, so a
// number changing upstream shows up in these assertions.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  ...jest.requireActual('@salmon/shared/src/motion/sinkFloat'),
}));

import {
  CHROME_SCALE,
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_EXIT_SCALE,
  SINK_FLOAT_STAGGER_MS,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
  floatEntering,
  sinkExiting,
} from './sinkAndFloat';

type StubTiming = {
  toValue: number;
  config: { duration: number; easing: number[] };
  delayMs?: number;
};
type StubAnimation = {
  initialValues: {
    opacity: number;
    transform: Array<{ translateY?: number; scale?: number }>;
  };
  animations: {
    opacity: StubTiming;
    transform: Array<{ translateY?: StubTiming; scale?: StubTiming }>;
  };
};

describe('sinkAndFloat', () => {
  it('chooses the instant cut under reduce motion', () => {
    expect(floatEntering(true)).toBeUndefined();
    expect(sinkExiting(true)).toBeUndefined();
  });

  it('floats in: arrives from depth, rising the travel accent while the light returns', () => {
    const entering = floatEntering(false);
    expect(entering).toBeDefined();

    const animation = (entering as unknown as () => StubAnimation)();
    expect(animation.initialValues).toEqual({
      opacity: 0,
      transform: [{ translateY: SINK_FLOAT_TRAVEL }, { scale: FLOAT_ENTER_SCALE }],
    });
    expect(animation.animations.opacity.toValue).toBe(1);
    expect(animation.animations.opacity.config.duration).toBe(FLOAT_IN_MS);
    expect(animation.animations.transform[0].translateY?.toValue).toBe(0);
    expect(animation.animations.transform[1].scale?.toValue).toBe(1);
  });

  it('splits the media: travel settles while the light returns on Beer–Lambert', () => {
    const entering = floatEntering(false);
    const animation = (entering as unknown as () => StubAnimation)();
    // The light comes back slow-then-fast — the accelerating `sink` bezier,
    // the vocabulary's closest shape to depthField's exp(-μ·depth).
    expect(animation.animations.opacity.config.easing).toEqual(motionEasing.sink.native);
    // The travel lands on `settle` — the Surfacing amount's damped, monotonic
    // tail. No overshoot: nothing bounces in this water.
    expect(animation.animations.transform[0].translateY?.config.easing).toEqual(
      motionEasing.settle.native
    );
  });

  it('sinks out: recedes to depth, dropping the travel accent — faster than it enters', () => {
    const exiting = sinkExiting(false);
    expect(exiting).toBeDefined();

    const animation = (exiting as unknown as () => StubAnimation)();
    expect(animation.initialValues).toEqual({
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
    expect(animation.animations.opacity.toValue).toBe(0);
    expect(animation.animations.opacity.config.duration).toBe(SINK_OUT_MS);
    expect(animation.animations.transform[0].translateY?.toValue).toBe(SINK_FLOAT_TRAVEL);
    // The recession is the point of the exit: without it the swap read as a
    // Y-slide, which is the regression this assertion exists to catch.
    expect(animation.animations.transform[1].scale?.toValue).toBe(SINK_EXIT_SCALE);
    expect(SINK_OUT_MS).toBeLessThan(FLOAT_IN_MS);
  });

  it('recedes on settle while travel and light accelerate on sink', () => {
    const animation = (sinkExiting(false) as unknown as () => StubAnimation)();
    // The depth is where the content comes to rest — a landing, not a drop.
    expect(animation.animations.transform[1].scale?.config.easing).toEqual(
      motionEasing.settle.native
    );
    expect(animation.animations.transform[0].translateY?.config.easing).toEqual(
      motionEasing.sink.native
    );
    expect(animation.animations.opacity.config.easing).toEqual(motionEasing.sink.native);
  });

  it('mirrors the halves on one Z axis, with travel kept to an accent', () => {
    expect(FLOAT_ENTER_SCALE).toBe(SINK_EXIT_SCALE);
    expect(SINK_FLOAT_TRAVEL).toBeLessThan(12);
  });

  it('takes a per-call scale override — chrome goes half as deep as content', () => {
    const entering = floatEntering(false, { distance: SINK_FLOAT_TRAVEL / 2, scale: CHROME_SCALE });
    const enterAnimation = (entering as unknown as () => StubAnimation)();
    expect(enterAnimation.initialValues.transform[1].scale).toBe(CHROME_SCALE);
    expect(enterAnimation.initialValues.transform[0].translateY).toBe(SINK_FLOAT_TRAVEL / 2);

    const exiting = sinkExiting(false, { distance: SINK_FLOAT_TRAVEL / 2, scale: CHROME_SCALE });
    const exitAnimation = (exiting as unknown as () => StubAnimation)();
    expect(exitAnimation.animations.transform[1].scale?.toValue).toBe(CHROME_SCALE);
    expect(1 - CHROME_SCALE).toBeCloseTo((1 - SINK_EXIT_SCALE) / 2, 10);
  });

  it('takes per-call distance and duration overrides — the owner tunes by eye', () => {
    const entering = floatEntering(false, { distance: 16, durationMs: motionMs.contentSwap });
    const animation = (entering as unknown as () => StubAnimation)();
    expect(animation.initialValues.transform[0].translateY).toBe(16);
    expect(animation.animations.opacity.config.duration).toBe(motionMs.contentSwap);
  });

  it('floats without delay by default — an arrival with no prior sink must not lag', () => {
    const entering = floatEntering(false);
    const animation = (entering as unknown as () => StubAnimation)();
    expect(animation.animations.opacity.delayMs).toBeUndefined();
    expect(animation.animations.transform[0].translateY?.delayMs).toBeUndefined();
  });

  it('waits the beat when asked: every animated property starts after delayMs', () => {
    const entering = floatEntering(false, { delayMs: FLOAT_DELAY_MS });
    const animation = (entering as unknown as () => StubAnimation)();
    expect(animation.animations.opacity.delayMs).toBe(FLOAT_DELAY_MS);
    expect(animation.animations.transform[0].translateY?.delayMs).toBe(FLOAT_DELAY_MS);
    expect(animation.animations.transform[1].scale?.delayMs).toBe(FLOAT_DELAY_MS);
  });

  it('sizes the beat to outlast the sink — the two halves must never overlap', () => {
    expect(FLOAT_DELAY_MS).toBe(SINK_OUT_MS + 90);
    expect(FLOAT_DELAY_MS).toBeGreaterThan(SINK_OUT_MS);
  });

  it('derives the durations from the water clock, not the generic-UI ramp', () => {
    // Float: drift×2 — inside the owner's 450–650 band, between `rise` and `tide`.
    expect(FLOAT_IN_MS).toBe(motionMs.drift * 2);
    expect(FLOAT_IN_MS).toBeGreaterThanOrEqual(450);
    expect(FLOAT_IN_MS).toBeLessThanOrEqual(650);
    // Sink: tide/2 — inside the owner's 320–400 band.
    expect(SINK_OUT_MS).toBe(motionMs.tide / 2);
    expect(SINK_OUT_MS).toBeGreaterThanOrEqual(320);
    expect(SINK_OUT_MS).toBeLessThanOrEqual(400);
  });

  it('inherits the band stagger from the Surfacing chrome', () => {
    expect(SINK_FLOAT_STAGGER_MS).toBe(motionMs.stagger);
  });

  it('re-exports the shared constants rather than declaring its own', () => {
    // Identity, not equality: a mobile-local copy that happens to compute the
    // same number today is exactly the drift this module exists to prevent.
    expect(SINK_FLOAT_TRAVEL).toBe(shared.SINK_FLOAT_TRAVEL);
    expect(FLOAT_ENTER_SCALE).toBe(shared.FLOAT_ENTER_SCALE);
    expect(SINK_EXIT_SCALE).toBe(shared.SINK_EXIT_SCALE);
    expect(CHROME_SCALE).toBe(shared.CHROME_SCALE);
    expect(FLOAT_IN_MS).toBe(shared.FLOAT_IN_MS);
    expect(SINK_OUT_MS).toBe(shared.SINK_OUT_MS);
    expect(FLOAT_DELAY_MS).toBe(shared.FLOAT_DELAY_MS);
    expect(SINK_FLOAT_STAGGER_MS).toBe(shared.SINK_FLOAT_STAGGER_MS);
  });
});
