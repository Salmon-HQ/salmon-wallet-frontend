// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { movePointer } from '../../test/armApproval';
import { APPROVE_ARM_MS, useApprovalArming } from './useApprovalArming';

type Arming = { current: ReturnType<typeof useApprovalArming> };

const wait = (ms = APPROVE_ARM_MS) => act(() => vi.advanceTimersByTime(ms));
const enterApprove = (result: Arming) => act(() => result.current.handlers.onPointerEnter());

describe('useApprovalArming', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('takes no click until the window has been in front for the arming delay', () => {
    // A page can predict where Approve appears and fire the request on the
    // first click of a double click; the second must land on a dead button.
    const { result } = renderHook(() => useApprovalArming());
    expect(result.current.armed).toBe(false);

    wait(APPROVE_ARM_MS - 1);
    movePointer();
    enterApprove(result);
    expect(result.current.armed).toBe(false);

    wait(1);
    movePointer();
    enterApprove(result);
    expect(result.current.armed).toBe(true);
  });

  // The delay alone is a wait a page can time: it asks for a pause between
  // clicks and the second one lands on Approve without the pointer moving.
  it('stays unarmed after the delay until the pointer moves in the window', () => {
    const { result } = renderHook(() => useApprovalArming());
    wait(APPROVE_ARM_MS * 10);
    enterApprove(result);
    expect(result.current.armed).toBe(false);

    // A browser reports a pointer the window opened under with an event at
    // the same spot; that is not a person moving it.
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { screenX: 300, screenY: 400 }));
      window.dispatchEvent(new MouseEvent('pointermove', { screenX: 300, screenY: 400 }));
    });
    enterApprove(result);
    expect(result.current.armed).toBe(false);

    movePointer();
    enterApprove(result);
    expect(result.current.armed).toBe(true);
  });

  // A pointer already resting on Approve when the window armed is where a
  // page's lure put it: Approve waits for the pointer to come onto it afresh.
  it('takes a click only once the pointer comes onto Approve after moving', () => {
    const { result } = renderHook(() => useApprovalArming());
    wait();
    enterApprove(result);
    movePointer();
    expect(result.current.armed).toBe(false);

    enterApprove(result);
    expect(result.current.armed).toBe(true);
  });

  it('ignores pointer movement from before the delay ran out', () => {
    const { result } = renderHook(() => useApprovalArming());
    movePointer();
    wait();
    enterApprove(result);

    expect(result.current.armed).toBe(false);
  });

  // Tab, or a screen reader moving focus: the person is in the window. A
  // click cannot do this from the predictable spot, which is Approve itself
  // and takes no focus while disabled.
  it('arms on focus moving in the window, for a person who does not use a pointer', () => {
    const button = document.body.appendChild(document.createElement('button'));
    const { result } = renderHook(() => useApprovalArming());
    wait();

    act(() => button.focus());

    expect(result.current.armed).toBe(true);
    button.remove();
  });

  it('disarms when the window loses focus and re-arms only after the delay and a move', () => {
    // Bringing an existing approval window forward is the same trick as
    // opening a new one.
    const { result } = renderHook(() => useApprovalArming());
    wait();
    movePointer();
    enterApprove(result);
    expect(result.current.armed).toBe(true);

    act(() => void window.dispatchEvent(new Event('blur')));
    expect(result.current.armed).toBe(false);

    act(() => void window.dispatchEvent(new Event('focus')));
    movePointer();
    enterApprove(result);
    expect(result.current.armed).toBe(false);
    wait();
    movePointer();
    enterApprove(result);
    expect(result.current.armed).toBe(true);
  });
});
