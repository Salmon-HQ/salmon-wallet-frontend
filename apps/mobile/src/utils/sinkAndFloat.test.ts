/**
 * The sink-and-float contract. What matters is not the pixels but the
 * decisions that are easy to regress silently: exit sinks *down* and enter
 * floats *up* over the same named distance, the durations come from the
 * shared vocabulary (`drift` in, `ebb` out — exit faster than enter), and
 * reduce motion gets no layout animation at all — the swap stays a cut.
 */
import { motionMs } from '@salmon/shared';

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

import {
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
  floatEntering,
  sinkExiting,
} from './sinkAndFloat';

type StubTiming = { toValue: number; config: { duration: number }; delayMs?: number };
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

  it('keeps the durations on the shared vocabulary', () => {
    expect(FLOAT_IN_MS).toBe(motionMs.drift);
    expect(SINK_OUT_MS).toBe(motionMs.ebb);
  });
});
