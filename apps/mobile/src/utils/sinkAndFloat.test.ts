/**
 * The sink-and-float contract. What matters is not the pixels but the
 * decisions that are easy to regress silently: exit sinks *down* and enter
 * floats *up* over the same named distance, the durations are derived from
 * the water's clock (drift×2 in, tide/2 out — exit faster than enter), the
 * light runs on its own Beer–Lambert curve while the travel settles, and
 * reduce motion gets no layout animation at all — the swap stays a cut.
 */
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
// does not transform. Only the motion vocabulary matters here — and it is the
// real one, so a token change shows up in these assertions.
jest.mock('@salmon/shared', () => jest.requireActual('@salmon/shared/src/theme/durations'));

// The verb-depth debug switch, made mutable so both variants are asserted in
// one run. The helpers read it at call time, so flipping the property between
// tests is enough — no module re-require needed.
const mockVerbDepthModule = { verbDepth: 'current' as 'current' | 'pushback' };
jest.mock('../debug/verbDepth', () => ({
  // A getter defers the read past the mock factory's hoisted execution, so
  // the helpers always see the value the running test just set.
  get verbDepth() {
    return mockVerbDepthModule.verbDepth;
  },
}));

import {
  PUSHBACK_ENTER_SCALE,
  PUSHBACK_SINK_SCALE,
  PUSHBACK_TRAVEL,
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
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
  beforeEach(() => {
    // The shipped default is asserted separately; the current-verb contract
    // below runs against the `current` selection.
    mockVerbDepthModule.verbDepth = 'current';
  });

  it('chooses the instant cut under reduce motion', () => {
    expect(floatEntering(true)).toBeUndefined();
    expect(sinkExiting(true)).toBeUndefined();
  });

  it('floats in: rises the named travel while fading and settling from 0.97', () => {
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

  it('sinks out: drops the same travel while the light goes — faster than it enters', () => {
    const exiting = sinkExiting(false);
    expect(exiting).toBeDefined();

    const animation = (exiting as unknown as () => StubAnimation)();
    expect(animation.initialValues).toEqual({ opacity: 1, transform: [{ translateY: 0 }] });
    expect(animation.animations.opacity.toValue).toBe(0);
    expect(animation.animations.opacity.config.duration).toBe(SINK_OUT_MS);
    expect(animation.animations.transform[0].translateY?.toValue).toBe(SINK_FLOAT_TRAVEL);
    expect(SINK_OUT_MS).toBeLessThan(FLOAT_IN_MS);
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

  describe('the pushback re-weighting (debug/verbDepth)', () => {
    beforeEach(() => {
      mockVerbDepthModule.verbDepth = 'pushback';
    });

    it('ships with pushback selected — the candidate is what the owner sees on reload', () => {
      expect(jest.requireActual('../debug/verbDepth').verbDepth).toBe('pushback');
    });

    it('still cuts under reduce motion', () => {
      expect(floatEntering(true)).toBeUndefined();
      expect(sinkExiting(true)).toBeUndefined();
    });

    it('exits by receding: scale to 0.90 on settle, travel shrunk to the accent', () => {
      const exiting = sinkExiting(false);
      const animation = (exiting as unknown as () => StubAnimation)();
      expect(animation.initialValues).toEqual({
        opacity: 1,
        transform: [{ translateY: 0 }, { scale: 1 }],
      });
      // The recession is a landing, not a drop — the settle-family curve.
      expect(animation.animations.transform[1].scale?.toValue).toBe(PUSHBACK_SINK_SCALE);
      expect(animation.animations.transform[1].scale?.config.easing).toEqual(
        motionEasing.settle.native
      );
      // Travel is the accent; light and travel keep the sink curve and clock.
      expect(animation.animations.transform[0].translateY?.toValue).toBe(PUSHBACK_TRAVEL);
      expect(animation.animations.transform[0].translateY?.config.easing).toEqual(
        motionEasing.sink.native
      );
      expect(animation.animations.opacity.toValue).toBe(0);
      expect(animation.animations.opacity.config.duration).toBe(SINK_OUT_MS);
      expect(animation.animations.opacity.config.easing).toEqual(motionEasing.sink.native);
    });

    it('enters from depth: scale from 0.90 to 1, travel the accent, light unchanged', () => {
      const entering = floatEntering(false);
      const animation = (entering as unknown as () => StubAnimation)();
      expect(animation.initialValues).toEqual({
        opacity: 0,
        transform: [{ translateY: PUSHBACK_TRAVEL }, { scale: PUSHBACK_ENTER_SCALE }],
      });
      expect(animation.animations.transform[1].scale?.toValue).toBe(1);
      expect(animation.animations.transform[0].translateY?.toValue).toBe(0);
      expect(animation.animations.opacity.toValue).toBe(1);
      expect(animation.animations.opacity.config.duration).toBe(FLOAT_IN_MS);
      expect(animation.animations.opacity.config.easing).toEqual(motionEasing.sink.native);
    });

    it('maps a per-call distance override onto the travel accent; scale stays the verb’s own', () => {
      const entering = floatEntering(false, { distance: 16, durationMs: motionMs.contentSwap });
      const enterAnimation = (entering as unknown as () => StubAnimation)();
      expect(enterAnimation.initialValues.transform[0].translateY).toBe(16);
      expect(enterAnimation.initialValues.transform[1].scale).toBe(PUSHBACK_ENTER_SCALE);
      expect(enterAnimation.animations.opacity.config.duration).toBe(motionMs.contentSwap);

      const exiting = sinkExiting(false, { distance: 16 });
      const exitAnimation = (exiting as unknown as () => StubAnimation)();
      expect(exitAnimation.animations.transform[0].translateY?.toValue).toBe(16);
      expect(exitAnimation.animations.transform[1].scale?.toValue).toBe(PUSHBACK_SINK_SCALE);
    });

    it('still honors the beat: every animated property waits out delayMs', () => {
      const entering = floatEntering(false, { delayMs: FLOAT_DELAY_MS });
      const animation = (entering as unknown as () => StubAnimation)();
      expect(animation.animations.opacity.delayMs).toBe(FLOAT_DELAY_MS);
      expect(animation.animations.transform[0].translateY?.delayMs).toBe(FLOAT_DELAY_MS);
      expect(animation.animations.transform[1].scale?.delayMs).toBe(FLOAT_DELAY_MS);
    });

    it('keeps the tuning bands: travel 0–10dp, scales 0.88–0.93', () => {
      expect(PUSHBACK_TRAVEL).toBeGreaterThanOrEqual(0);
      expect(PUSHBACK_TRAVEL).toBeLessThanOrEqual(10);
      expect(PUSHBACK_SINK_SCALE).toBeGreaterThanOrEqual(0.88);
      expect(PUSHBACK_SINK_SCALE).toBeLessThanOrEqual(0.93);
    });

    it('leaves the current variant byte-for-byte when current is selected', () => {
      mockVerbDepthModule.verbDepth = 'current';
      const exiting = sinkExiting(false);
      const animation = (exiting as unknown as () => StubAnimation)();
      // No scale track on the current exit — translation-only, as shipped.
      expect(animation.initialValues).toEqual({ opacity: 1, transform: [{ translateY: 0 }] });
      expect(animation.animations.transform).toHaveLength(1);
      expect(animation.animations.transform[0].translateY?.toValue).toBe(SINK_FLOAT_TRAVEL);

      const entering = floatEntering(false);
      const enterAnimation = (entering as unknown as () => StubAnimation)();
      expect(enterAnimation.initialValues.transform).toEqual([
        { translateY: SINK_FLOAT_TRAVEL },
        { scale: FLOAT_ENTER_SCALE },
      ]);
    });
  });
});
