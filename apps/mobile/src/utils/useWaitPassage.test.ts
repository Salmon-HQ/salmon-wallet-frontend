/**
 * The passage's contract: it is `useWaitExit` plus the verb's two halves,
 * with the standard beat on the entering side — and nothing of its own. No
 * new timing lives here; a number changing in `sinkAndFloat` must show up
 * through this hook unchanged.
 */
import { act, renderHook } from '@testing-library/react-native';

let mockReduceMotion = false;

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  useReducedMotion: () => mockReduceMotion,
  withTiming: (toValue: unknown, config: unknown) => ({ toValue, config }),
  withDelay: (delayMs: number, animation: Record<string, unknown>) => ({ delayMs, ...animation }),
  Easing: { bezier: (...coefficients: number[]) => coefficients },
}));

// The shared barrel reaches the Solana ESM packages, which this Jest config
// does not transform. The passage needs the real motion vocabulary and the
// real wait-exit hook — a fake of either would let this test pass while the
// composition drifted.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  ...jest.requireActual('@salmon/shared/src/hooks/useWaitExit'),
}));

import { FLOAT_DELAY_MS, SINK_OUT_MS } from './sinkAndFloat';
import { useWaitPassage } from './useWaitPassage';

type StubTiming = { toValue: number; config: { duration: number }; delayMs?: number };
type StubAnimation = {
  animations: {
    opacity: StubTiming;
    transform: Array<{ translateY?: StubTiming; scale?: StubTiming }>;
  };
};

describe('useWaitPassage', () => {
  afterEach(() => {
    mockReduceMotion = false;
  });

  it('hands out the verb with the standard beat and no numbers of its own', () => {
    const { result } = renderHook(() => useWaitPassage(false));

    const exiting = (result.current.exiting as unknown as () => StubAnimation)();
    expect(exiting.animations.opacity.config.duration).toBe(SINK_OUT_MS);

    const entering = (result.current.entering as unknown as () => StubAnimation)();
    expect(entering.animations.opacity.delayMs).toBe(FLOAT_DELAY_MS);
    expect(entering.animations.transform[0].translateY?.delayMs).toBe(FLOAT_DELAY_MS);
  });

  it('cuts under reduce motion — no layout animation at all', () => {
    mockReduceMotion = true;
    const { result } = renderHook(() => useWaitPassage(false));

    expect(result.current.exiting).toBeUndefined();
    expect(result.current.entering).toBeUndefined();
  });

  it('keeps the wait held until it reports its closing wave has left', () => {
    const { result, rerender } = renderHook(
      ({ showWait }: { showWait: boolean }) => useWaitPassage(showWait),
      { initialProps: { showWait: false } }
    );

    // A surface that never waited renders its content on the first frame.
    expect(result.current.held).toBe(false);

    rerender({ showWait: true });
    expect(result.current.held).toBe(true);

    // The work resolved, but the wave is still leaving the screen.
    rerender({ showWait: false });
    expect(result.current.held).toBe(true);

    act(() => result.current.onExited());
    expect(result.current.held).toBe(false);
  });
});
