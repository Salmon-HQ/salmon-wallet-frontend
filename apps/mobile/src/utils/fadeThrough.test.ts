/**
 * The fade-through contract for a keyed content swap (Home's per-chain
 * content). What matters is not the pixels but the two decisions that are easy
 * to regress silently: the durations come from the shared vocabulary
 * (`contentSwap` in, `flick` out — exit faster than enter), and reduce motion
 * gets no layout animation at all — the swap stays the instant cut.
 */
import { motionMs } from '@salmon/shared';

// Reanimated pulls the Worklets native module, which does not exist under
// Jest. `withTiming` is stubbed to echo its arguments so the assertions can
// read the target and the duration the helper actually chose.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  withTiming: (toValue: unknown, config: unknown) => ({ toValue, config }),
  Easing: {
    bezier: (...coefficients: number[]) => coefficients,
  },
}));

// The shared barrel reaches the Solana ESM packages, which this Jest config
// does not transform. Only the motion vocabulary matters here — and it is the
// real one, so a token change shows up in these assertions.
jest.mock('@salmon/shared', () => jest.requireActual('@salmon/shared/src/theme/durations'));

import { FADE_THROUGH_ENTER_SCALE, fadeThroughEntering, fadeThroughExiting } from './fadeThrough';

type StubTiming = { toValue: number; config: { duration: number } };
type StubAnimation = {
  initialValues: { opacity: number; transform?: Array<{ scale: number }> };
  animations: { opacity: StubTiming; transform?: Array<{ scale: StubTiming }> };
};

describe('fadeThrough', () => {
  it('chooses the instant cut under reduce motion', () => {
    expect(fadeThroughEntering(true)).toBeUndefined();
    expect(fadeThroughExiting(true)).toBeUndefined();
  });

  it('enters with a fade + settle from 0.97 over contentSwap', () => {
    const entering = fadeThroughEntering(false);
    expect(entering).toBeDefined();

    const animation = (entering as unknown as () => StubAnimation)();
    expect(animation.initialValues).toEqual({
      opacity: 0,
      transform: [{ scale: FADE_THROUGH_ENTER_SCALE }],
    });
    expect(animation.animations.opacity.toValue).toBe(1);
    expect(animation.animations.opacity.config.duration).toBe(motionMs.contentSwap);
    expect(animation.animations.transform?.[0].scale.toValue).toBe(1);
    expect(animation.animations.transform?.[0].scale.config.duration).toBe(motionMs.contentSwap);
  });

  it('exits with a plain fade over a flick — faster than it enters', () => {
    const exiting = fadeThroughExiting(false);
    expect(exiting).toBeDefined();

    const animation = (exiting as unknown as () => StubAnimation)();
    expect(animation.initialValues).toEqual({ opacity: 1 });
    expect(animation.animations.opacity.toValue).toBe(0);
    expect(animation.animations.opacity.config.duration).toBe(motionMs.flick);
    expect(motionMs.flick).toBeLessThan(motionMs.contentSwap);
  });
});
