/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useExplorerLink } from './useExplorerLink';

const t = vi.fn((key: string, options?: Record<string, unknown>) =>
  options?.name ? `${key}:${options.name}` : key
);

/** Flushes the microtask chain `openExplorer` awaits before reporting. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useExplorerLink', () => {
  let openUrl: ReturnType<typeof vi.fn<(url: string) => Promise<void>>>;
  let onPress: ReturnType<typeof vi.fn<(url: string, explorerName: string) => void>>;

  beforeEach(() => {
    openUrl = vi.fn(() => Promise.resolve());
    onPress = vi.fn();
  });

  it('picks the default explorer and offers no menu when there is only one', () => {
    const { result } = renderHook(() =>
      useExplorerLink({
        txHash: 'tx-1',
        blockchain: 'BITCOIN',
        environment: 'bitcoin-mainnet',
        t,
        openUrl,
        onPress,
      })
    );

    expect(result.current.hasMenu).toBe(false);
    expect(result.current.rows.length).toBeGreaterThan(0);
    expect(result.current.buttonText).toBe(
      `transactions.detail.viewOn:${result.current.rows[0].title}`
    );
  });

  it('offers a menu on Solana, where more than one explorer is configured', () => {
    const { result } = renderHook(() =>
      useExplorerLink({ txHash: 'tx-1', blockchain: 'SOLANA', showMenu: true, t, openUrl, onPress })
    );

    expect(result.current.rows.length).toBeGreaterThan(1);
    expect(result.current.hasMenu).toBe(true);
    expect(result.current.buttonText).toBe('transactions.detail.viewOnExplorer');
  });

  it('builds one row per explorer, keyed and tested by its testID', () => {
    const { result } = renderHook(() =>
      useExplorerLink({ txHash: 'tx-1', blockchain: 'SOLANA', showMenu: true, t, openUrl, onPress })
    );

    for (const row of result.current.rows) {
      expect(row.testID).toBe(`tx-detail-explorer-${row.key}`);
      expect(row.title).toBeTruthy();
    }
  });

  it('onPress opens the menu when there is a choice', () => {
    const { result } = renderHook(() =>
      useExplorerLink({ txHash: 'tx-1', blockchain: 'SOLANA', showMenu: true, t, openUrl, onPress })
    );

    expect(result.current.menuVisible).toBe(false);
    act(() => result.current.onPress());
    expect(result.current.menuVisible).toBe(true);
    expect(openUrl).not.toHaveBeenCalled();

    act(() => result.current.closeMenu());
    expect(result.current.menuVisible).toBe(false);
  });

  it('onPress opens the selected explorer directly when there is no choice, and reports it', async () => {
    const { result } = renderHook(() =>
      useExplorerLink({
        txHash: 'tx-1',
        blockchain: 'SOLANA',
        showMenu: false,
        t,
        openUrl,
        onPress,
      })
    );

    await act(async () => {
      result.current.onPress();
      await flush();
    });

    expect(openUrl).toHaveBeenCalledTimes(1);
    const [url] = openUrl.mock.calls[0];
    expect(url).toContain('tx-1');
    expect(onPress).toHaveBeenCalledWith(url, result.current.rows[0].title);
  });

  it("a row's own press opens that explorer and closes the menu", async () => {
    const { result } = renderHook(() =>
      useExplorerLink({ txHash: 'tx-1', blockchain: 'SOLANA', showMenu: true, t, openUrl, onPress })
    );

    act(() => result.current.onPress());
    expect(result.current.menuVisible).toBe(true);

    const secondRow = result.current.rows[1];
    await act(async () => {
      secondRow.onPress();
      await flush();
    });

    expect(openUrl).toHaveBeenCalledTimes(1);
    const [url] = openUrl.mock.calls[0];
    expect(onPress).toHaveBeenCalledWith(url, secondRow.title);
    expect(result.current.menuVisible).toBe(false);
  });
});
