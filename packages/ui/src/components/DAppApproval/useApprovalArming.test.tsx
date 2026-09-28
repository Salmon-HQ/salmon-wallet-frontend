// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APPROVE_ARM_MS, useApprovalArming } from './useApprovalArming';

describe('useApprovalArming', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('takes no click until the window has been in front for the arming delay', () => {
    // A page can predict where Approve appears and fire the request on the
    // first click of a double click; the second must land on a dead button.
    const { result } = renderHook(() => useApprovalArming());
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(APPROVE_ARM_MS - 1));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it('disarms when the window loses focus and re-arms only after the delay', () => {
    // Bringing an existing approval window forward is the same trick as
    // opening a new one.
    const { result } = renderHook(() => useApprovalArming());
    act(() => vi.advanceTimersByTime(APPROVE_ARM_MS));
    expect(result.current).toBe(true);

    act(() => void window.dispatchEvent(new Event('blur')));
    expect(result.current).toBe(false);

    act(() => void window.dispatchEvent(new Event('focus')));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(APPROVE_ARM_MS));
    expect(result.current).toBe(true);
  });
});
