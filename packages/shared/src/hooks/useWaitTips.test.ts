/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWaitTips } from './useWaitTips';

describe('useWaitTips', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ticks every interval while active and advances when the caller says so', () => {
    const onTick = vi.fn((advance: () => void) => advance());
    const { result } = renderHook(() =>
      useWaitTips({ count: 3, intervalMs: 1000, active: true, onTick })
    );

    expect(result.current.index).toBe(0);
    act(() => vi.advanceTimersByTime(1000));
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(result.current.index).toBe(1);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.index).toBe(0);
  });

  it('does not tick with a single tip or while inactive', () => {
    const onTick = vi.fn();
    const single = renderHook(() =>
      useWaitTips({ count: 1, intervalMs: 500, active: true, onTick })
    );
    const hidden = renderHook(() =>
      useWaitTips({ count: 3, intervalMs: 500, active: false, onTick })
    );
    act(() => vi.advanceTimersByTime(2000));
    expect(onTick).not.toHaveBeenCalled();
    expect(single.result.current.index).toBe(0);
    expect(hidden.result.current.index).toBe(0);
  });

  it('stops the clock when the wait hides', () => {
    const onTick = vi.fn();
    const { rerender } = renderHook(
      ({ active }) => useWaitTips({ count: 2, intervalMs: 500, active, onTick }),
      { initialProps: { active: true } }
    );
    act(() => vi.advanceTimersByTime(500));
    expect(onTick).toHaveBeenCalledTimes(1);
    rerender({ active: false });
    act(() => vi.advanceTimersByTime(2000));
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('wraps on the count it has at advance time', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useWaitTips({ count, intervalMs: 500, active: false, onTick: (a) => a() }),
      { initialProps: { count: 5 } }
    );
    act(() => result.current.advance());
    act(() => result.current.advance());
    expect(result.current.index).toBe(2);
    rerender({ count: 3 });
    act(() => result.current.advance());
    expect(result.current.index).toBe(0);
  });
});
