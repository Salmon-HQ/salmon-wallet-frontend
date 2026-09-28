/** @vitest-environment jsdom */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SheetParentContext } from './SheetHeightContext';
import { useSheetTurn } from './useSheetTurn';

const motion = () => ({ sink: vi.fn(), rise: vi.fn(), leave: vi.fn() });

describe('useSheetTurn', () => {
  it('as a parent: sinks when the child asks, rises back if still wanted, leaves if dismissed', () => {
    const m = motion();
    const { result, rerender } = renderHook(
      ({ visible }) => useSheetTurn(visible, vi.fn(), false, m),
      { initialProps: { visible: true } }
    );
    const handle = result.current.parentHandle;

    act(() => handle.yieldToChild());
    expect(m.sink).toHaveBeenCalledTimes(1);
    expect(result.current.yielded).toBe(true);
    expect(result.current.isYielded()).toBe(true);

    act(() => handle.releaseFromChild());
    expect(m.rise).toHaveBeenCalledTimes(1);
    expect(result.current.yielded).toBe(false);

    act(() => handle.yieldToChild());
    rerender({ visible: false });
    act(() => handle.releaseFromChild());
    expect(m.leave).toHaveBeenCalledTimes(1);
    // One object for the sheet's whole life.
    expect(result.current.parentHandle).toBe(handle);
  });

  it('as a child: holds the parent turn once, and gives it back on unmount if never released', () => {
    const parent = { yieldToChild: vi.fn(), releaseFromChild: vi.fn(), dismissWithChild: vi.fn() };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SheetParentContext.Provider value={parent}>{children}</SheetParentContext.Provider>
    );
    const { result, unmount } = renderHook(() => useSheetTurn(true, vi.fn(), false, motion()), {
      wrapper,
    });
    expect(result.current.parent).toBe(parent);
    expect(result.current.childEnterDelayMs).toBeGreaterThan(0);

    act(() => result.current.holdParentTurn());
    expect(parent.yieldToChild).toHaveBeenCalledTimes(1);

    act(() => result.current.releaseParentTurn());
    act(() => result.current.releaseParentTurn());
    expect(parent.releaseFromChild).toHaveBeenCalledTimes(1);

    act(() => result.current.holdParentTurn());
    unmount();
    expect(parent.releaseFromChild).toHaveBeenCalledTimes(2);
  });
});
