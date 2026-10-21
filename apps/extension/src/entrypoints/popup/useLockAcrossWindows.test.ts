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
  accountIds?: string[];
}

/**
 * Mounts one wallet window. `closing` is that window's pagehide flag; `reload`
 * re-reads its wallets from storage and answers whether it could.
 */
function openWindow(initial: WindowState, reloadResult = true) {
  const lock = vi.fn();
  const reload = vi.fn(async () => reloadResult);
  const closing = { current: false };
  const view = renderHook(
    (state: WindowState) =>
      useLockAcrossWindows({ accountIds: ['W'], ...state, closing, lock, reload }),
    {
      initialProps: initial,
    }
  );
  return { ...view, lock, reload, closing };
}

/** Another window writes the stored wallet list, as the shared storage does: JSON. */
const storeWalletList = (ids: string[]) =>
  fakeBrowser.storage.local.set({ salmon_accounts: JSON.stringify(ids.map((id) => ({ id }))) });

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

describe('useLockAcrossWindows — a wallet list changed in another window', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('re-reads the wallets of a window whose list is behind storage', async () => {
    const sidePanel = openWindow({ ready: true, locked: false, accountIds: ['W'] });

    await storeWalletList(['W', 'X']);

    await waitFor(() => expect(sidePanel.reload).toHaveBeenCalledTimes(1));
    expect(sidePanel.lock).not.toHaveBeenCalled();
  });

  it('leaves alone the window whose list already matches, such as the one that wrote it', async () => {
    const sidePanel = openWindow({ ready: true, locked: false, accountIds: ['W', 'X'] });

    await storeWalletList(['X', 'W']);
    await settle();

    expect(sidePanel.reload).not.toHaveBeenCalled();
  });

  it('leaves a locked window alone: unlocking reads the list anyway', async () => {
    const sidePanel = openWindow({ ready: true, locked: true, accountIds: ['W'] });

    await storeWalletList(['W', 'X']);
    await settle();

    expect(sidePanel.reload).not.toHaveBeenCalled();
  });

  it('locks the window it cannot re-read, without locking the one that made the change', async () => {
    const writer = openWindow({ ready: true, locked: false, accountIds: ['W', 'X'] });
    const stale = openWindow({ ready: true, locked: false, accountIds: ['W'] }, false);

    await storeWalletList(['W', 'X']);
    await waitFor(() => expect(stale.lock).toHaveBeenCalledTimes(1));
    stale.rerender({ ready: true, locked: true, accountIds: ['W'] });
    await settle();

    expect(writer.lock).not.toHaveBeenCalled();
  });

  it('does not lock over an emptied list: the window that removed every wallet is that writer', async () => {
    const sidePanel = openWindow({ ready: true, locked: false, accountIds: ['W'] }, false);

    await fakeBrowser.storage.local.remove('salmon_accounts');
    await settle();

    expect(sidePanel.lock).not.toHaveBeenCalled();
  });
});
