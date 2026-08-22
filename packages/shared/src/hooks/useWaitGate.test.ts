/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { motionMs } from '../theme/durations';
import { useWaitGate } from './useWaitGate';

describe('useWaitGate', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('never mounts a wait screen for work that finishes inside the delay', () => {
    const { result, rerender } = renderHook(({ active }) => useWaitGate(active), {
      initialProps: { active: true },
    });

    act(() => {
      vi.advanceTimersByTime(motionMs.waitDelay - 1);
    });
    expect(result.current).toBe(false);

    rerender({ active: false });
    act(() => {
      vi.advanceTimersByTime(motionMs.waitDelay + motionMs.waitMinVisible);
    });
    expect(result.current).toBe(false);
  });

  it('mounts once the wait passes the delay', () => {
    const { result } = renderHook(() => useWaitGate(true));

    act(() => {
      vi.advanceTimersByTime(motionMs.waitDelay);
    });
    expect(result.current).toBe(true);
  });

  it('holds the mounted screen for the minimum, so a wait that resolves just over the delay does not flash', () => {
    const { result, rerender } = renderHook(({ active }) => useWaitGate(active), {
      initialProps: { active: true },
    });

    act(() => {
      vi.advanceTimersByTime(motionMs.waitDelay + 10);
    });
    expect(result.current).toBe(true);

    rerender({ active: false });
    act(() => {
      vi.advanceTimersByTime(motionMs.waitMinVisible - 20);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(30);
    });
    expect(result.current).toBe(false);
  });
});
