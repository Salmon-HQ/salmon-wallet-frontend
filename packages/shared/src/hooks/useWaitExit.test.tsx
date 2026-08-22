/**
 * @vitest-environment jsdom
 */
/**
 * The hold, tested as behaviour rather than as timing.
 *
 * The bug it exists for is a one-line one and it was in five files: a surface
 * that renders `if (loading) return <LoadingScreen />` swaps branches the frame
 * `loading` flips, unmounting the wait mid-wave. What has to hold is that the
 * wait stays rendered *past* that flip and until it says it has gone.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useWaitExit } from './useWaitExit';

describe('useWaitExit', () => {
  it('renders nothing on a surface that never waited', () => {
    const { result } = renderHook(() => useWaitExit(false));

    expect(result.current.held).toBe(false);
  });

  it('holds the wait past the moment the work resolves', () => {
    const { result, rerender } = renderHook(({ showWait }) => useWaitExit(showWait), {
      initialProps: { showWait: true },
    });

    expect(result.current.held).toBe(true);

    // The work resolves. The wait must still be rendered — with `visible=false`,
    // which is what starts its closing wave.
    rerender({ showWait: false });
    expect(result.current.held).toBe(true);

    act(() => result.current.onExited());
    expect(result.current.held).toBe(false);
  });

  it('holds again on a second wait, rather than latching open once', () => {
    const { result, rerender } = renderHook(({ showWait }) => useWaitExit(showWait), {
      initialProps: { showWait: true },
    });
    rerender({ showWait: false });
    act(() => result.current.onExited());
    expect(result.current.held).toBe(false);

    rerender({ showWait: true });
    expect(result.current.held).toBe(true);
    rerender({ showWait: false });
    expect(result.current.held).toBe(true);
  });

  it('keeps a stable callback, so a caller cannot restart its own exit', () => {
    const { result, rerender } = renderHook(({ showWait }) => useWaitExit(showWait), {
      initialProps: { showWait: true },
    });
    const first = result.current.onExited;

    rerender({ showWait: false });

    expect(result.current.onExited).toBe(first);
  });
});
