/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withVaultWriteLock } from '@salmon/shared';

import App from './App';

const mockLockAccounts = vi.fn();
const mockRemoveAllAccounts = vi.fn();
const mockUnlockWithCachedKey = vi.fn();
const mockUseInactivityTimeout = vi.fn();
const mockClearSessionKey = vi.fn();
const mockUseSecretClipboardResume = vi.fn();
const mockGetStashItem = vi.fn();
const eventListeners = new Map<string, EventListener>();
const { accountsState, mockUseLockAcrossWindows, renderedStates } = vi.hoisted(() => ({
  accountsState: {
    unprotectedAddresses: null as string[] | null,
    locked: false,
    accounts: [{ id: 'account-1' }] as { id: string }[],
  },
  mockUseLockAcrossWindows: vi.fn(),
  // Every value a `useState` hands back while rendering, so a test can see
  // what the popup still holds in its state.
  renderedStates: [] as unknown[],
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  const useState = ((initial: unknown) => {
    const pair = actual.useState(initial);
    renderedStates.push(pair[0]);
    return pair;
  }) as typeof actual.useState;
  return { ...actual, default: { ...actual, useState }, useState };
});

vi.mock('./useLockAcrossWindows', () => ({
  useLockAcrossWindows: (params: unknown) => mockUseLockAcrossWindows(params),
}));

vi.mock('@salmon/shared', async () => ({
  // The real write lock: the reload must wait for a write turn it does not own.
  withVaultWriteLock: (
    await vi.importActual<typeof import('@salmon/shared/hooks/useAccountsMutationHelpers')>(
      '@salmon/shared/hooks/useAccountsMutationHelpers'
    )
  ).withVaultWriteLock,
  getStashItem: (...args: unknown[]) => mockGetStashItem(...args),
  isKeyCacheValid: (cache: unknown) => cache != null,
  STASH_KEYS: { DERIVED_KEY: 'derived_key' },
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
      accounts: accountsState.accounts,
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
  PhraseBackupSheet: () => null,
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

// The onboarding pages as the host drives them: each hands back what its real
// screen would, so the tests walk the steps the popup routes between.
vi.mock('../../pages/auth/SelectOptionsPage', () => ({
  SelectOptionsPage: (props: { onCreateWallet: () => void; onRecoverWallet: () => void }) => (
    <div data-testid="select-page">
      <button data-testid="select-create" onClick={props.onCreateWallet} />
      <button data-testid="select-recover" onClick={props.onRecoverWallet} />
    </div>
  ),
}));

vi.mock('../../pages/auth/CreateWalletPage', () => ({
  CreateWalletPage: (props: { onComplete: (m: string) => void }) => (
    <button data-testid="create-done" onClick={() => props.onComplete('phrase')} />
  ),
}));

vi.mock('../../pages/auth/RecoverWalletPage', () => ({
  RecoverWalletPage: (props: { onComplete: (m: string) => void }) => (
    <button data-testid="recover-done" onClick={() => props.onComplete('phrase')} />
  ),
}));

vi.mock('../../pages/auth/NetworkChoicePage', () => ({
  NetworkChoicePage: (props: { flowType: string; onBack: () => void; onContinue: () => void }) => (
    <div data-testid="onboarding-networks-screen" data-flow={props.flowType}>
      <button data-testid="networks-back" onClick={props.onBack} />
      <button data-testid="networks-choose" onClick={props.onContinue} />
    </div>
  ),
}));

vi.mock('../../pages/auth/PasswordPage', () => ({
  PasswordPage: (props: {
    flowType: string;
    addresses?: string[];
    onRemoveWallet?: () => Promise<void>;
    onBack?: () => void;
    onSuccess?: () => void;
  }) => (
    <div data-testid="password-page" data-flow={props.flowType}>
      {props.addresses?.join(',')}
      {props.onRemoveWallet && (
        <button data-testid="password-remove" onClick={() => void props.onRemoveWallet?.()} />
      )}
      {props.onBack && <button data-testid="password-back" onClick={props.onBack} />}
      {props.onSuccess && <button data-testid="password-success" onClick={props.onSuccess} />}
    </div>
  ),
}));

vi.mock('../../pages/auth/SuccessPage', () => ({
  SuccessPage: (props: { onGoToWallet: () => void }) => (
    <button data-testid="success-go" onClick={props.onGoToWallet} />
  ),
}));

vi.mock('../../pages/auth/AnalyticsConsentPage', () => ({
  AnalyticsConsentPage: () => <div data-testid="consent-page" />,
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

describe('Extension popup onboarding: choosing networks', () => {
  afterEach(() => {
    cleanup();
    accountsState.accounts = [{ id: 'account-1' }];
  });

  beforeEach(() => {
    vi.clearAllMocks();
    accountsState.accounts = [];
    vi.stubGlobal('chrome', {
      storage: { onChanged: { addListener: vi.fn(), removeListener: vi.fn() } },
    });
  });

  it.each([
    ['create', 'select-create', 'create-done'],
    ['recover', 'select-recover', 'recover-done'],
  ])('asks after the phrase on %s, and a choice opens the password', (flow, start, done) => {
    render(<App />);
    fireEvent.click(screen.getByTestId(start));
    fireEvent.click(screen.getByTestId(done));

    expect(screen.getByTestId('onboarding-networks-screen').getAttribute('data-flow')).toBe(flow);
    expect(screen.queryByTestId('password-page')).toBeNull();

    fireEvent.click(screen.getByTestId('networks-choose'));
    expect(screen.getByTestId('password-page').getAttribute('data-flow')).toBe(flow);

    fireEvent.click(screen.getByTestId('password-back'));
    expect(screen.getByTestId('onboarding-networks-screen')).toBeTruthy();
  });

  it.each([
    ['create', 'select-create', 'create-done'],
    ['recover', 'select-recover', 'recover-done'],
  ])('goes back from the question to the %s phrase', (_flow, start, done) => {
    render(<App />);
    fireEvent.click(screen.getByTestId(start));
    fireEvent.click(screen.getByTestId(done));

    fireEvent.click(screen.getByTestId('networks-back'));

    expect(screen.getByTestId(done)).toBeTruthy();
  });

  it('never asks an install that already has a wallet', () => {
    accountsState.accounts = [{ id: 'account-1' }];

    render(<App />);

    expect(screen.queryByTestId('onboarding-networks-screen')).toBeNull();
    expect(screen.queryByTestId('select-page')).toBeNull();
  });

  it('drops the phrase once the wallet is saved, and still shows success and consent', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('select-create'));
    fireEvent.click(screen.getByTestId('create-done'));
    fireEvent.click(screen.getByTestId('networks-choose'));
    fireEvent.click(screen.getByTestId('password-success'));

    renderedStates.length = 0;
    fireEvent.click(screen.getByTestId('success-go'));

    expect(screen.getByTestId('consent-page')).toBeTruthy();
    expect(renderedStates.length).toBeGreaterThan(0);
    expect(renderedStates.filter((value) => JSON.stringify(value)?.includes('"phrase"'))).toEqual(
      []
    );
  });
});

describe('Extension popup reload after a wallet list change elsewhere', () => {
  // A turn left held by a failing case would block every later case's turn.
  const heldTurns: (() => void)[] = [];

  afterEach(() => {
    heldTurns.splice(0).forEach((release) => release());
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStashItem.mockResolvedValue({ key: 'cached' });
    vi.stubGlobal('chrome', {
      storage: { onChanged: { addListener: vi.fn(), removeListener: vi.fn() } },
    });
  });

  function holdWriteTurn(onRelease: () => void = () => {}) {
    let release: () => void = () => {};
    const ready = new Promise<void>((started) => {
      void withVaultWriteLock(
        () =>
          new Promise<void>((done) => {
            release = () => {
              onRelease();
              done();
            };
            heldTurns.push(done);
            started();
          })
      );
    });
    return { ready, release: () => release() };
  }

  const reloadFromHost = () =>
    (mockUseLockAcrossWindows.mock.lastCall?.[0] as { reload: () => Promise<boolean> }).reload;

  it('waits for a write turn in flight before re-reading the wallets', async () => {
    mockUnlockWithCachedKey.mockResolvedValue(true);
    render(<App />);
    const turn = holdWriteTurn();
    await turn.ready;

    const reloaded = reloadFromHost()();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockUnlockWithCachedKey).not.toHaveBeenCalled();

    turn.release();
    await expect(reloaded).resolves.toBe(true);
    expect(mockUnlockWithCachedKey).toHaveBeenCalledTimes(1);
  });

  it('shows the wallet another window added together with the one this window saved', async () => {
    // D was added in another window; this stale window is saving C.
    const stored = { ids: ['A', 'D'], active: 'A' };
    let shown: { ids: string[]; active: string } | null = null;
    mockUnlockWithCachedKey.mockImplementation(async () => {
      shown = { ids: [...stored.ids], active: stored.active };
      return true;
    });
    render(<App />);
    const save = holdWriteTurn(() => {
      stored.ids.push('C');
      stored.active = 'C';
    });
    await save.ready;

    const reloaded = reloadFromHost()();
    await new Promise((resolve) => setTimeout(resolve, 0));
    save.release();
    await reloaded;

    expect(shown).toEqual({ ids: ['A', 'D', 'C'], active: 'C' });
  });
});
