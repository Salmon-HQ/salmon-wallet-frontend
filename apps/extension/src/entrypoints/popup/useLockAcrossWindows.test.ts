/**
 * Locking in one wallet window locks the others.
 *
 * Every wallet window (side panel, each approval popup) holds its own unlocked
 * accounts in memory. Locking changed only the window it happened in, so an
 * approval popup opened earlier stayed approvable after the user pressed Lock.
 * Each test mounts the hook twice, as two windows sharing one session storage.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { useLockAcrossWindows } from './useLockAcrossWindows';

interface WindowState {
  ready: boolean;
  locked: boolean;
}

/** Mounts one wallet window. `closing` is that window's pagehide flag. */
function openWindow(initial: WindowState) {
  const lock = vi.fn();
  const closing = { current: false };
  const view = renderHook((state: WindowState) => useLockAcrossWindows({ ...state, closing, lock }), {
    initialProps: initial,
  });
  return { ...view, lock, closing };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('useLockAcrossWindows', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('locks every other unlocked window when one window locks', async () => {
    const sidePanel = openWindow({ ready: true, locked: false });
    const popup = openWindow({ ready: true, locked: false });

    sidePanel.rerender({ ready: true, locked: true });

    await waitFor(() => expect(popup.lock).toHaveBeenCalledTimes(1));
    expect(sidePanel.lock).not.toHaveBeenCalled();
  });

  it('does not lock the others when a window locks because it is closing', async () => {
    const popup = openWindow({ ready: true, locked: false });
    const sidePanel = openWindow({ ready: true, locked: false });

    popup.closing.current = true;
    popup.rerender({ ready: true, locked: true });
    await settle();

    expect(sidePanel.lock).not.toHaveBeenCalled();
  });

  it('does not lock the others when a window opens already locked', async () => {
    const sidePanel = openWindow({ ready: true, locked: false });
    const popup = openWindow({ ready: false, locked: false });

    popup.rerender({ ready: true, locked: true });
    await settle();

    expect(sidePanel.lock).not.toHaveBeenCalled();
  });

  it('does not pass on a lock it received', async () => {
    const sidePanel = openWindow({ ready: true, locked: false });
    const popup = openWindow({ ready: true, locked: false });
    const set = vi.spyOn(fakeBrowser.storage.session, 'set');

    sidePanel.rerender({ ready: true, locked: true });
    await waitFor(() => expect(popup.lock).toHaveBeenCalledTimes(1));
    popup.rerender({ ready: true, locked: true });
    await settle();

    expect(set).toHaveBeenCalledTimes(1);
  });
});
