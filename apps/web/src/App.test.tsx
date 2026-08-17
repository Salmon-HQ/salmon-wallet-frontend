/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

const mockLockAccounts = vi.fn();
const mockUseInactivityTimeout = vi.fn();
const mockClearSessionKey = vi.fn();
const eventListeners = new Map<string, EventListener>();

vi.mock('@salmon/ui', () => ({
  WalletLayout: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  PendingActivityBanner: () => null,
}));

vi.mock('react-router-dom', () => ({
  RouterProvider: () => null,
}));

vi.mock('./router', () => ({
  router: {},
}));

vi.mock('./utils/sessionKeyCache', () => ({
  clearSessionKey: () => mockClearSessionKey(),
}));

vi.mock('./providers/DAppSettlementBridge', () => ({
  DAppSettlementBridge: () => null,
}));

vi.mock('@salmon/shared', async () => {
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  return {
    useAccountsContext: () => [
      {
        ready: true,
        locked: false,
        accounts: [{ id: 'account-1' }],
      },
      {
        lockAccounts: mockLockAccounts,
      },
    ],
    useInactivityTimeout: (config: unknown) => mockUseInactivityTimeout(config),
    createQueryClient: () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
    QueryClientProvider,
    BridgeSettlementProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    PendingTransactionsProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    usePendingActivity: () => ({ items: [], dismiss: vi.fn() }),
  };
});

describe('Web inactivity lock', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    eventListeners.clear();
    mockClearSessionKey.mockResolvedValue(undefined);
    mockLockAccounts.mockResolvedValue(undefined);
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      eventListeners.set(type, listener as EventListener);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((type) => {
      eventListeners.delete(type);
    });
  });

  it('configures inactivity lock only when wallet is unlocked and accounts exist', () => {
    render(<App />);

    expect(mockUseInactivityTimeout).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        timeoutMs: 5 * 60 * 1000,
      })
    );
  });

  it('clears session cache and locks accounts on inactivity timeout', async () => {
    render(<App />);

    const onTimeout = mockUseInactivityTimeout.mock.calls[0]?.[0]?.onTimeout as
      (() => void) | undefined;

    expect(onTimeout).toBeTypeOf('function');
    onTimeout?.();
    await Promise.resolve();

    expect(mockClearSessionKey).toHaveBeenCalledTimes(1);
    expect(mockLockAccounts).toHaveBeenCalledTimes(1);
  });

  it('clears session cache and locks accounts when the web app closes', async () => {
    render(<App />);

    const onPageHide = eventListeners.get('pagehide');

    expect(onPageHide).toBeTypeOf('function');
    onPageHide?.(new Event('pagehide'));
    await Promise.resolve();

    expect(mockClearSessionKey).toHaveBeenCalledTimes(1);
    expect(mockLockAccounts).toHaveBeenCalledTimes(1);
  });
});
