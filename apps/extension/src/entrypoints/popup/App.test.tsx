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
const mockUseSecretClipboardResume = vi.fn();
const eventListeners = new Map<string, EventListener>();
const { accountsState, mockUseLockAcrossWindows } = vi.hoisted(() => ({
  accountsState: { unprotectedAddresses: null as string[] | null, locked: false },
  mockUseLockAcrossWindows: vi.fn(),
}));

vi.mock('./useLockAcrossWindows', () => ({
  useLockAcrossWindows: (params: unknown) => mockUseLockAcrossWindows(params),
}));

vi.mock('@salmon/shared', () => ({
  SignatureRequestProvider: ({ children }: { children: React.ReactNode }) => children,
  isSignableSolanaAccount: () => false,
  colors: {
    background: { primary: '#000' },
    accent: { primary: '#0f0', tint: '#0f04' },
  },
  useAccountsContext: () => [
    {
      ready: true,
      locked: accountsState.locked,
      accounts: [{ id: 'account-1' }],
      activeAccount: null,
      activeBlockchainAccount: null,
      accountId: 'account-1',
      networkId: 'solana-mainnet',
      pathIndex: 0,
      unprotectedAddresses: accountsState.unprotectedAddresses,
    },
    {
      lockAccounts: mockLockAccounts,
      removeAllAccounts: mockRemoveAllAccounts,
      unlockWithCachedKey: mockUnlockWithCachedKey,
    },
  ],
  useInactivityTimeout: (config: unknown) => mockUseInactivityTimeout(config),
  useSettleAfterTx: () => vi.fn(),
  // The boot wait goes through the shared `LoadingScreen` now: the gate
  // decides whether it is worth mounting, the exit keeps it on screen until
  // the closing wave has left.
  useWaitGate: (active: boolean) => active,
  useWaitExit: (showWait: boolean) => ({ held: showWait, onExited: vi.fn() }),
  useAnalyticsConsent: () => ({ resolveConsentPrompt: vi.fn() }),
}));

vi.mock('@salmon/shared/utils/account', () => ({
  getActiveSolanaApprovalAccount: () => null,
}));

vi.mock('@salmon/ui', () => ({
  WalletInitErrorScreen: () => null,
  ConfirmationHost: () => null,
  // The popup's first frame names the water column itself, so the mock has to
  // carry the host class the real barrel exports.
  waterColumnHost: 'water-column-host',
  // The popup publishes the surfacing itself when the lock's overlay is
  // released — the lock's own wait opts out of it (spec 031).
  useTaskChrome: () => ({ surface: () => {} }),
  useSecretClipboardResume: () => mockUseSecretClipboardResume(),
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
  LockPage: () => <div data-testid="lock-page" />,
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
  PasswordPage: (props: {
    flowType: string;
    addresses?: string[];
    onRemoveWallet?: () => Promise<void>;
  }) => (
    <div data-testid="password-page" data-flow={props.flowType}>
      {props.addresses?.join(',')}
      {props.onRemoveWallet && (
        <button data-testid="password-remove" onClick={() => void props.onRemoveWallet?.()} />
      )}
    </div>
  ),
}));

vi.mock('../../pages/auth/SuccessPage', () => ({
  SuccessPage: () => null,
}));

vi.mock('../../pages/auth/AnalyticsConsentPage', () => ({
  AnalyticsConsentPage: () => null,
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

  // A recovery phrase or private key copied 60 s ago or more leaves the
  // clipboard when the panel opens or comes back into focus.
  it('clears a secret left on the clipboard from the root', () => {
    render(<App />);

    expect(mockUseSecretClipboardResume).toHaveBeenCalled();
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

    const onTimeout = mockUseInactivityTimeout.mock.calls[0]?.[0]?.onTimeout as
      (() => void) | undefined;

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

describe('Extension popup with a wallet stored without a password', () => {
  afterEach(() => {
    cleanup();
    accountsState.unprotectedAddresses = null;
    accountsState.locked = false;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('chrome', {
      storage: { onChanged: { addListener: vi.fn(), removeListener: vi.fn() } },
    });
  });

  it('opens on the password screen listing its addresses, and on nothing else', () => {
    accountsState.unprotectedAddresses = ['AddrOne', 'AddrTwo'];

    const { getByTestId } = render(<App />);

    const page = getByTestId('password-page');
    expect(page.getAttribute('data-flow')).toBe('protect');
    expect(page.textContent).toBe('AddrOne,AddrTwo');
  });

  // The lock screen over it would take every attempt as a wrong password and
  // offer to remove the wallet, deleting the only copy of its seeds.
  it('stays on the password screen even when the wallet reads as locked', () => {
    accountsState.unprotectedAddresses = ['AddrOne'];
    accountsState.locked = true;

    const { getByTestId, queryByTestId } = render(<App />);

    expect(getByTestId('password-page').getAttribute('data-flow')).toBe('protect');
    expect(queryByTestId('lock-page')).toBeNull();
  });

  // The protect screen's way out is the lock screen's reset: the session key
  // and every wallet go, in that order of trust, and the welcome screen opens.
  it('removes the wallet the way the lock screen resets it', async () => {
    accountsState.unprotectedAddresses = ['AddrOne'];
    mockRemoveAllAccounts.mockResolvedValue(undefined);

    const { getByTestId } = render(<App />);
    getByTestId('password-remove').click();

    await vi.waitFor(() => expect(mockRemoveAllAccounts).toHaveBeenCalledTimes(1));
    expect(mockClearSessionKey).toHaveBeenCalledTimes(1);
  });

  it('runs no inactivity lock while the wallet waits for its password', () => {
    accountsState.unprotectedAddresses = ['AddrOne'];

    render(<App />);

    expect(mockUseInactivityTimeout).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it('ignores a lock from another window while the wallet waits for its password', async () => {
    accountsState.unprotectedAddresses = ['AddrOne'];

    render(<App />);
    const { lock } = mockUseLockAcrossWindows.mock.lastCall?.[0] as { lock: () => void };
    lock();
    await Promise.resolve();

    expect(mockLockAccounts).not.toHaveBeenCalled();
    expect(mockClearSessionKey).not.toHaveBeenCalled();
  });

  it('opens normally once the wallet has a password', () => {
    const { queryByTestId } = render(<App />);

    expect(queryByTestId('password-page')).toBeNull();
  });
});
