/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useExplorerLink } from './useExplorerLink';

const t = vi.fn((key: string, options?: Record<string, unknown>) =>
  options?.name ? `${key}:${options.name}` : key
);

describe('useExplorerLink', () => {
  it('picks the default explorer and offers no menu when there is only one', () => {
    const { result } = renderHook(() =>
      useExplorerLink({
        txHash: 'tx-1',
        blockchain: 'BITCOIN',
        environment: 'bitcoin-mainnet',
        t,
      })
    );

    expect(result.current.availableExplorers.length).toBeGreaterThan(0);
    expect(result.current.selectedExplorer).toBeTruthy();
    expect(result.current.hasMenu).toBe(false);
    expect(result.current.buttonText).toBe(
      `transactions.detail.viewOn:${result.current.selectedExplorer?.name}`
    );
  });

  it('offers a menu on Solana, where more than one explorer is configured', () => {
    const { result } = renderHook(() =>
      useExplorerLink({ txHash: 'tx-1', blockchain: 'SOLANA', showMenu: true, t })
    );

    expect(result.current.availableExplorers.length).toBeGreaterThan(1);
    expect(result.current.hasMenu).toBe(true);
    expect(result.current.buttonText).toBe('transactions.detail.viewOnExplorer');
  });

  it('toggles menuVisible through openMenu/closeMenu', () => {
    const { result } = renderHook(() =>
      useExplorerLink({ txHash: 'tx-1', blockchain: 'SOLANA', showMenu: true, t })
    );

    expect(result.current.menuVisible).toBe(false);
    act(() => result.current.openMenu());
    expect(result.current.menuVisible).toBe(true);
    act(() => result.current.closeMenu());
    expect(result.current.menuVisible).toBe(false);
  });

  it('resolves the transaction URL for a given explorer', () => {
    const { result } = renderHook(() =>
      useExplorerLink({ txHash: 'tx-1', blockchain: 'SOLANA', t })
    );

    const explorer = result.current.selectedExplorer;
    expect(explorer).toBeTruthy();
    const url = explorer && result.current.getExplorerUrl(explorer);
    expect(url).toContain('tx-1');
  });

  it('resolvePress opens the menu when there is a choice, otherwise hands the caller its opener', () => {
    const openExplorer = vi.fn();

    const { result: withMenu } = renderHook(() =>
      useExplorerLink({ txHash: 'tx-1', blockchain: 'SOLANA', showMenu: true, t })
    );
    act(() => withMenu.current.resolvePress(openExplorer));
    expect(withMenu.current.menuVisible).toBe(true);
    expect(openExplorer).not.toHaveBeenCalled();

    const { result: withoutMenu } = renderHook(() =>
      useExplorerLink({ txHash: 'tx-1', blockchain: 'SOLANA', showMenu: false, t })
    );
    act(() => withoutMenu.current.resolvePress(openExplorer));
    expect(openExplorer).toHaveBeenCalledWith(withoutMenu.current.selectedExplorer);
  });
});
