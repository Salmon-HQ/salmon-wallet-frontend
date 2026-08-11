/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

const mockLockAccounts = vi.fn();
const mockRemoveAllAccounts = vi.fn();
const mockUnlockWithCachedKey = vi.fn();
const mockUseInactivityTimeout = vi.fn();
const mockClearSessionKey = vi.fn();
const eventListeners = new Map<string, EventListener>();

vi.mock('@salmon/shared', () => ({
  colors: {
    background: { primary: '#000' },
    accent: { primary: '#0f0', tint: '#0f04' },
  },
  useAccountsContext: () => [{
    ready: true,
    locked: false,
    accounts: [{ id: 'account-1' }],
    activeAccount: null,
    activeBlockchainAccount: null,
    accountId: 'account-1',
    networkId: 'solana-mainnet',
    pathIndex: 0,
  }, {
    lockAccounts: mockLockAccounts,
    removeAllAccounts: mockRemoveAllAccounts,
    unlockWithCachedKey: mockUnlockWithCachedKey,
  }],
  useInactivityTimeout: (config: unknown) => mockUseInactivityTimeout(config),
  useSettleAfterTx: () => vi.fn(),
  useAnalyticsConsent: () => ({ resolveConsentPrompt: vi.fn() }),
}));

vi.mock('@salmon/shared/utils/account', () => ({
  getActiveSolanaApprovalAccount: () => null,
}));

vi.mock('@salmon/ui', () => ({
  WalletInitErrorScreen: () => null,
}));

vi.mock('../../utils/sessionKeyCache', () => ({
  clearSessionKey: () => mockClearSessionKey(),
}));

vi.mock('../../utils/storageCompat', () => ({
  sessionArea: {
    get: vi.fn(() => Promise.resolve({})),
    set: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../pages/lock/LockPage', () => ({
  LockPage: () => null,
}));

vi.mock('../../pages/home/HomePage', () => ({
  HomePage: () => null,
}));

vi.mock('../../pages/dapp', () => ({
  DAppConnectPage: () => null,
  DAppTransactionApprovalPage: () => null,
  DAppSignMessageApprovalPage: () => null,
}));

vi.mock('../../pages/auth/SelectOptionsPage', () => ({
  SelectOptionsPage: () => null,
}));

vi.mock('../../pages/auth/CreateWalletPage', () => ({
  CreateWalletPage: () => null,
}));

vi.mock('../../pages/auth/RecoverWalletPage', () => ({
  RecoverWalletPage: () => null,
}));

vi.mock('../../pages/auth/PasswordPage', () => ({
  PasswordPage: () => null,
}));

vi.mock('../../pages/auth/SuccessPage', () => ({
  SuccessPage: () => null,
}));

vi.mock('../../pages/auth/AnalyticsConsentPage', () => ({
  AnalyticsConsentPage: () => null,
}));

vi.mock('../../pages/auth/DerivedAccountsPage', () => ({
  DerivedAccountsPage: () => null,
}));

describe('Extension popup inactivity lock', () => {
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

    vi.stubGlobal('chrome', {
      storage: {
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  it('configures inactivity lock when wallet is unlocked and has accounts', () => {
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

    const onTimeout = mockUseInactivityTimeout.mock.calls[0]?.[0]?.onTimeout as (() => void) | undefined;

    expect(onTimeout).toBeTypeOf('function');
    onTimeout?.();
    await Promise.resolve();

    expect(mockClearSessionKey).toHaveBeenCalledTimes(1);
    expect(mockLockAccounts).toHaveBeenCalledTimes(1);
  });

  it('clears session cache and locks accounts when the popup closes', async () => {
    render(<App />);

    const onPageHide = eventListeners.get('pagehide');

    expect(onPageHide).toBeTypeOf('function');
    onPageHide?.(new Event('pagehide'));
    await Promise.resolve();

    expect(mockClearSessionKey).toHaveBeenCalledTimes(1);
    expect(mockLockAccounts).toHaveBeenCalledTimes(1);
  });
});
