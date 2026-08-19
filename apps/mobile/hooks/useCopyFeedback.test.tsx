/**
 * The copied tick travels both ways: it grows in when `trigger` fires and,
 * when the `feedbackHold` expires, it sinks back out *before* `copied`
 * reverts — the exit lag is what keeps the tick mounted while it leaves, so
 * consumers can keep their plain `copied ? tick : copyIcon` ternaries.
 * `reset()` skips the trip and hides it immediately (sheet close).
 *
 * Native-driver animations do not tick under Jest, so the assertions target
 * the state contract (hold, lag, instant reset) and the motion *decisions*
 * (timing, never spring — nothing bounces), not intermediate scale frames.
 */
import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';

const mockReducedMotion = jest.fn(async () => false);
jest
  .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
  .mockImplementation(() => mockReducedMotion());

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
}));

import { motionMs } from '@salmon/shared/src/theme';

import { useCopyFeedback } from './useCopyFeedback';

/** Read an RN Animated.Value's JS-side value. */
const valueOf = (animated: unknown): number =>
  (animated as { __getValue: () => number }).__getValue();

describe('useCopyFeedback (mobile wrapper)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('holds `copied` through the exit animation, then hides', () => {
    const { result } = renderHook(() => useCopyFeedback());
    expect(result.current.copied).toBe(false);

    act(() => result.current.trigger());
    expect(result.current.copied).toBe(true);

    // The shared hold expires; the tick is now sinking out but still shown.
    act(() => jest.advanceTimersByTime(motionMs.feedbackHold + 1));
    expect(result.current.copied).toBe(true);

    // The exit (`ebb`) finishes: the tick unmounts.
    act(() => jest.advanceTimersByTime(motionMs.ebb + 1));
    expect(result.current.copied).toBe(false);
  });

  it('keys survive the round trip', () => {
    const { result } = renderHook(() => useCopyFeedback());

    act(() => result.current.trigger('row-1'));
    expect(result.current.copiedKey).toBe('row-1');

    act(() => jest.advanceTimersByTime(motionMs.feedbackHold + 1));
    act(() => jest.advanceTimersByTime(motionMs.ebb + 1));
    expect(result.current.copiedKey).toBeNull();
  });

  it('reset() hides immediately, without the exit trip', () => {
    const { result } = renderHook(() => useCopyFeedback());

    act(() => result.current.trigger());
    expect(result.current.copied).toBe(true);

    act(() => result.current.reset());
    expect(result.current.copied).toBe(false);
    expect(valueOf(result.current.scale)).toBe(0);
  });

  it('animates with timing on both trips — nothing bounces', () => {
    const timingSpy = jest.spyOn(Animated, 'timing');
    const springSpy = jest.spyOn(Animated, 'spring');
    const { result } = renderHook(() => useCopyFeedback());

    act(() => result.current.trigger());
    act(() => jest.advanceTimersByTime(motionMs.feedbackHold + 1));
    act(() => jest.advanceTimersByTime(motionMs.ebb + 1));

    expect(springSpy).not.toHaveBeenCalled();
    const durations = timingSpy.mock.calls.map(([, config]) => config.duration);
    // Entrance travels on `swell`, exit on `ebb`.
    expect(durations).toContain(motionMs.swell);
    expect(durations).toContain(motionMs.ebb);
  });

  it('reduce motion keeps the feedback and drops the travel', async () => {
    mockReducedMotion.mockResolvedValue(true);
    const timingSpy = jest.spyOn(Animated, 'timing');
    const { result } = renderHook(() => useCopyFeedback());
    // Let the AccessibilityInfo promise land before any travel starts.
    await act(async () => {});
    timingSpy.mockClear();

    act(() => result.current.trigger());
    // Feedback preserved: the tick shows.
    expect(result.current.copied).toBe(true);
    // Travel dropped: every timing resolves to 0ms.
    for (const [, config] of timingSpy.mock.calls) {
      expect(config.duration).toBe(0);
    }

    // The hold is reading time and is NOT shortened.
    act(() => jest.advanceTimersByTime(motionMs.feedbackHold - 1));
    expect(result.current.copied).toBe(true);
    act(() => jest.advanceTimersByTime(2));
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.copied).toBe(false);
  });
});
