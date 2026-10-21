// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { armApproval, movePointer } from '../../test/armApproval';
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
    movePointer();
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    movePointer();
    expect(result.current).toBe(true);
  });

  // The delay alone is a wait a page can time: it asks for a pause between
  // clicks and the second one lands on Approve without the pointer moving.
  it('stays unarmed after the delay until the pointer moves in the window', () => {
    const { result } = renderHook(() => useApprovalArming());
    act(() => vi.advanceTimersByTime(APPROVE_ARM_MS * 10));
    expect(result.current).toBe(false);

    // A browser reports a pointer the window opened under with an event at
    // the same spot; that is not a person moving it.
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { screenX: 300, screenY: 400 }));
      window.dispatchEvent(new MouseEvent('pointermove', { screenX: 300, screenY: 400 }));
    });
    expect(result.current).toBe(false);

    movePointer();
    expect(result.current).toBe(true);
  });

  it('ignores pointer movement from before the delay ran out', () => {
    const { result } = renderHook(() => useApprovalArming());
    movePointer();
    act(() => vi.advanceTimersByTime(APPROVE_ARM_MS));

    expect(result.current).toBe(false);
  });

  // Tab, or a screen reader moving focus: the person is in the window. A
  // click cannot do this from the predictable spot, which is Approve itself
  // and takes no focus while disabled.
  it('arms on focus moving in the window, for a person who does not use a pointer', () => {
    const button = document.body.appendChild(document.createElement('button'));
    const { result } = renderHook(() => useApprovalArming());
    act(() => vi.advanceTimersByTime(APPROVE_ARM_MS));

    act(() => button.focus());

    expect(result.current).toBe(true);
    button.remove();
  });

  it('disarms when the window loses focus and re-arms only after the delay and a move', () => {
    // Bringing an existing approval window forward is the same trick as
    // opening a new one.
    const { result } = renderHook(() => useApprovalArming());
    armApproval();
    expect(result.current).toBe(true);

    act(() => void window.dispatchEvent(new Event('blur')));
    expect(result.current).toBe(false);

    act(() => void window.dispatchEvent(new Event('focus')));
    movePointer();
    expect(result.current).toBe(false);
    armApproval();
    expect(result.current).toBe(true);
  });
});
