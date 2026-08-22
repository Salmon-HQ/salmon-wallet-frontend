/**
 * Press feedback takes the parallel path under reduce motion — it does not go
 * quiet. The scale is travel and is dropped; the specular and the haptic are
 * feedback and are kept.
 */
import { renderHook, act } from '@testing-library/react-native';
import type { GestureResponderEvent } from 'react-native';

const mockImpactAsync = jest.fn();
const mockReducedMotion = jest.fn(() => false);
/** Every `withTiming(target, config)` the hook asked for. */
const calls: Array<{ target: unknown; duration?: number }> = [];

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {},
  useSharedValue: (value: unknown) => ({ value }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  useReducedMotion: () => mockReducedMotion(),
  withTiming: (target: unknown, config?: { duration?: number }) => {
    calls.push({ target, duration: config?.duration });
    return target;
  },
  Easing: { bezier: (...args: number[]) => args },
}));

jest.mock('../src/utils/haptics', () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@salmon/shared', () => jest.requireActual('@salmon/shared/src/theme'));

import { motionMs } from '@salmon/shared/src/theme';

import { PRESS_SCALE, usePressMotion } from './usePressMotion';
import { SPECULAR_OPACITY } from '../src/components/PressSpecular';

const press = { nativeEvent: { locationX: 40, locationY: 12 } } as GestureResponderEvent;

describe('usePressMotion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    calls.length = 0;
    mockReducedMotion.mockReturnValue(false);
  });

  it('spends `flick` and nothing else on a press', () => {
    const { result } = renderHook(() => usePressMotion());

    act(() => result.current.pressHandlers.onPressIn(press));
    act(() => result.current.pressHandlers.onPressOut());

    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.duration).toBe(motionMs.flick);
    }
    expect(motionMs.flick).toBe(90);
  });

  it('displaces the control by the specified scale and lets it back up', () => {
    const { result } = renderHook(() => usePressMotion());

    act(() => result.current.pressHandlers.onPressIn(press));
    expect(calls.map((call) => call.target)).toContain(PRESS_SCALE);
    expect(PRESS_SCALE).toBe(0.985);

    act(() => result.current.pressHandlers.onPressOut());
    expect(calls.map((call) => call.target)).toContain(1);
  });

  it('puts the specular at the touch point', () => {
    const { result } = renderHook(() => usePressMotion());

    act(() => result.current.pressHandlers.onPressIn(press));

    expect(result.current.specular.x.value).toBe(40);
    expect(result.current.specular.y.value).toBe(12);
    expect(calls.map((call) => call.target)).toContain(SPECULAR_OPACITY);
  });

  it('drops the scale under reduce motion but keeps the specular and the haptic', () => {
    mockReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => usePressMotion());

    act(() => result.current.pressHandlers.onPressIn(press));

    // Travel is gone…
    expect(calls.map((call) => call.target)).not.toContain(PRESS_SCALE);
    // …feedback is not.
    expect(calls.map((call) => call.target)).toContain(SPECULAR_OPACITY);
    expect(mockImpactAsync).toHaveBeenCalledWith('light');
    // And the step is a step: zero duration, not a shortened animation.
    for (const call of calls) {
      expect(call.duration).toBe(0);
    }
  });
});
