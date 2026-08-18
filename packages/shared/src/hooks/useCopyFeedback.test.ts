/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { motionMs } from '../theme/durations';
import { useCopyFeedback } from './useCopyFeedback';

describe('useCopyFeedback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts idle', () => {
    const { result } = renderHook(() => useCopyFeedback());
    expect(result.current.copied).toBe(false);
    expect(result.current.copiedKey).toBeNull();
  });

  it('shows the confirmation on trigger and holds it for feedbackHold', () => {
    const { result } = renderHook(() => useCopyFeedback());

    act(() => result.current.trigger());
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(motionMs.feedbackHold - 1);
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.copied).toBe(false);
  });

  it('tracks a per-row key so a list can show one confirmation at a time', () => {
    const { result } = renderHook(() => useCopyFeedback());

    act(() => result.current.trigger(2));
    expect(result.current.copiedKey).toBe(2);
    expect(result.current.copied).toBe(true);

    act(() => result.current.trigger(5));
    expect(result.current.copiedKey).toBe(5);

    act(() => {
      vi.advanceTimersByTime(motionMs.feedbackHold);
    });
    expect(result.current.copiedKey).toBeNull();
  });

  it('restarts the hold on a re-trigger instead of expiring early', () => {
    const { result } = renderHook(() => useCopyFeedback());

    act(() => result.current.trigger());
    act(() => {
      vi.advanceTimersByTime(motionMs.feedbackHold - 100);
    });
    act(() => result.current.trigger());
    act(() => {
      vi.advanceTimersByTime(motionMs.feedbackHold - 1);
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.copied).toBe(false);
  });

  it('reset hides the confirmation immediately and cancels the pending timeout', () => {
    const { result } = renderHook(() => useCopyFeedback());

    act(() => result.current.trigger());
    act(() => result.current.reset());
    expect(result.current.copied).toBe(false);

    act(() => {
      vi.advanceTimersByTime(motionMs.feedbackHold * 2);
    });
    expect(result.current.copied).toBe(false);
  });

  it('clears the pending timeout on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useCopyFeedback());

    act(() => result.current.trigger());
    unmount();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
