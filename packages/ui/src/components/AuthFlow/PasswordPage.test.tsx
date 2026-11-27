/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DuplicateAccountError,
  IncorrectPasswordError,
  UnlockThrottledError,
  VaultReadRefusedError,
} from '@salmon/shared';
import { PasswordPage } from './PasswordPage';

// Hoisted so the vi.mock factory below can reference it — vi.mock is lifted
// above every top-level statement in this file.
// Mutable so individual tests can flip requiredLock (single- vs two-input).
const { accountsState } = vi.hoisted(() => ({
  accountsState: { requiredLock: true, counter: 0 },
}));

const { MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }

    isNetworkError(): boolean {
      return this.status === 0;
    }
  }

  return { MockApiError };
});

const mockCreateAccount = vi.fn();
const mockCheckPassword = vi.fn();
const mockAddAccount = vi.fn();
const mockProtectWallet = vi.fn();
const mockMarkUnconfirmed = vi.fn();
const mockResetSalmon = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : _key),
  }),
}));

vi.mock('@salmon/shared/utils/account', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared/utils/account')>()),
  generateAccountName: () => 'Account #1',
}));

// The real barrel now loads fine under vitest (react-native is aliased to a
// stub); only the account-setup surface below needs deterministic control.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  ApiError: MockApiError,
  createAccount: (...args: unknown[]) => mockCreateAccount(...args),
  getScanNetworks: async () => ['solana'],
  getMirrorNetworks: async () => ({}),
  trackOnboardingEvent: async () => undefined,
  useAccountsContext: () => [
    accountsState,
    {
      checkPassword: mockCheckPassword,
      addAccount: mockAddAccount,
      protectWallet: mockProtectWallet,
    },
  ],
  getPasswordStrengthLabel: (strength: string) => `strength-${strength}`,
  usePhraseBackup: () => ({ markUnconfirmed: mockMarkUnconfirmed }),
}));

function renderPage() {
  return render(
    <PasswordPage
      mnemonic="test mnemonic"
      flowType="recover"
      onSuccess={vi.fn()}
      onBack={vi.fn()}
      onResetSalmon={mockResetSalmon}
    />
  );
}

async function submitPassword() {
  fireEvent.change(screen.getByTestId('password-input'), {
    target: { value: 'correct horse battery' },
  });
  fireEvent.click(screen.getByTestId('password-submit-button'));
}

// The i18n stub echoes the key back, so the assertions pin which message the
// component asks for rather than the copy itself.
const NETWORK_KEY = 'wallet.create.recovery_network_error';
const SEED_KEY = 'wallet.create.recovery_error';

describe('PasswordPage account setup errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountsState.requiredLock = true;
    mockCheckPassword.mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(cleanup);

  it('blames the connection, not the seed phrase, when the server is unreachable', async () => {
    mockCreateAccount.mockRejectedValue(
      new MockApiError('Network error: Unable to reach the server', 0)
    );

    renderPage();
    await submitPassword();

    await waitFor(() => {
      expect(screen.getByText(NETWORK_KEY)).toBeTruthy();
    });
    expect(screen.queryByText(SEED_KEY)).toBeNull();
  });

  it('still points at the seed phrase for a non-network failure', async () => {
    mockCreateAccount.mockRejectedValue(new Error('bad mnemonic checksum'));

    renderPage();
    await submitPassword();

    await waitFor(() => {
      expect(screen.getByText(SEED_KEY)).toBeTruthy();
    });
    expect(screen.queryByText(NETWORK_KEY)).toBeNull();
  });

  it('treats a server-side failure as a seed-phrase error, not a network one', async () => {
    mockCreateAccount.mockRejectedValue(new MockApiError('Internal Server Error', 500));

    renderPage();
    await submitPassword();

    await waitFor(() => {
      expect(screen.getByText(SEED_KEY)).toBeTruthy();
    });
    expect(screen.queryByText(NETWORK_KEY)).toBeNull();
  });
});

/**
 * "Nothing moves under the finger": the strength meter's and the general
 * error's slots are reserved from the first frame (ReservedSlot renders them
 * hidden via `inert` + `visibility: hidden`), so typing the first character
 * or a submit failure reveals content instead of shoving the layout.
 */
describe('PasswordPage step', () => {
  beforeEach(() => {
    accountsState.requiredLock = false;
  });

  afterEach(cleanup);

  // Create: warning, phrase, networks, password. Recover: phrase, networks, password.
  it.each([
    ['create', '4', '4'],
    ['recover', '3', '3'],
  ] as const)('is the last step of the %s flow', (flowType, now, max) => {
    render(
      <PasswordPage
        mnemonic="test mnemonic"
        flowType={flowType}
        onSuccess={vi.fn()}
        onBack={vi.fn()}
        onResetSalmon={mockResetSalmon}
      />
    );

    const dots = screen.getByRole('progressbar');
    expect([dots.getAttribute('aria-valuenow'), dots.getAttribute('aria-valuemax')]).toEqual([
      now,
      max,
    ]);
  });
});

describe('PasswordPage reserved slots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountsState.requiredLock = false;
    mockCheckPassword.mockResolvedValue(true);
  });

  afterEach(cleanup);

  it('reserves the strength meter and error slots before the first keystroke', () => {
    const { container } = renderPage();

    // Both slots exist, hidden — only ReservedSlot uses `inert` in this tree.
    expect(container.querySelectorAll('div[inert]')).toHaveLength(2);
    // The meter itself is already mounted inside its hidden slot.
    expect(screen.getByText(/^strength-/)).toBeTruthy();
  });

  it('reveals the strength meter in place on the first character', () => {
    const { container } = renderPage();

    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'a' } });

    // The strength slot flipped visible; the error slot is still reserved.
    expect(container.querySelectorAll('div[inert]')).toHaveLength(1);
    expect(screen.getByText(/^strength-/)).toBeTruthy();
  });
});

/**
 * A wallet stored without a password: the same screen shows its addresses and
 * asks for a new password, with confirmation, and protects the wallet with it.
 */
describe('PasswordPage protecting a wallet that has no password', () => {
  const ADDRESSES = ['AddressOne111', 'AddressTwo222'];

  beforeEach(() => {
    vi.clearAllMocks();
    // A cleartext vault opens unlocked with no lock required: the screen must
    // still ask for a new password twice, never check an existing one.
    accountsState.requiredLock = false;
    mockProtectWallet.mockResolvedValue(true);
  });

  afterEach(cleanup);

  const mockRemoveWallet = vi.fn();

  function renderProtect() {
    return render(
      <PasswordPage
        flowType="protect"
        addresses={ADDRESSES}
        onSuccess={vi.fn()}
        onRemoveWallet={mockRemoveWallet}
      />
    );
  }

  it('lists the addresses for the owner to recognise', () => {
    renderProtect();

    for (const address of ADDRESSES) expect(screen.getByText(address)).toBeTruthy();
    expect(screen.getByText('wallet.protect.body')).toBeTruthy();
  });

  it('protects the wallet with the confirmed password, creating nothing', async () => {
    renderProtect();

    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'correct horse battery' },
    });
    fireEvent.change(screen.getByTestId('password-confirm-input'), {
      target: { value: 'correct horse battery' },
    });
    fireEvent.click(screen.getByTestId('password-submit-button'));

    await waitFor(() => expect(mockProtectWallet).toHaveBeenCalledWith('correct horse battery'));
    expect(mockCreateAccount).not.toHaveBeenCalled();
    expect(mockAddAccount).not.toHaveBeenCalled();
    expect(mockCheckPassword).not.toHaveBeenCalled();
  });

  it('says so when the wallet could not be protected', async () => {
    mockProtectWallet.mockResolvedValue(false);
    renderProtect();

    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'correct horse battery' },
    });
    fireEvent.change(screen.getByTestId('password-confirm-input'), {
      target: { value: 'correct horse battery' },
    });
    fireEvent.click(screen.getByTestId('password-submit-button'));

    await waitFor(() => expect(screen.getByText('wallet.protect.error')).toBeTruthy());
  });

  // A wallet the owner does not recognise has a way out that is not a
  // password: removing it, after a sheet that says what that costs.
  it('removes the wallet only once the sheet is confirmed', async () => {
    mockRemoveWallet.mockResolvedValue(undefined);
    renderProtect();

    fireEvent.click(screen.getByTestId('password-protect-remove-button'));
    expect(screen.getByText('wallet.protect.remove_title')).toBeTruthy();
    expect(screen.getByText('wallet.protect.remove_message')).toBeTruthy();
    expect(mockRemoveWallet).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(mockRemoveWallet).toHaveBeenCalledTimes(1));
    expect(mockProtectWallet).not.toHaveBeenCalled();
  });

  it('keeps the wallet when the sheet is cancelled', () => {
    renderProtect();

    fireEvent.click(screen.getByTestId('password-protect-remove-button'));
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));

    expect(mockRemoveWallet).not.toHaveBeenCalled();
  });
});

/**
 * The save's own result decides what the page says: a retry is the same
 * wallet, a refused save says why with copy that exists, and a wallet created
 * without the phrase check is marked by the save itself.
 */
describe('PasswordPage saving the wallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountsState.requiredLock = true;
    mockCheckPassword.mockResolvedValue(true);
    mockAddAccount.mockResolvedValue(undefined);
    mockCreateAccount.mockImplementation(
      async ({ id, avatar }: { id: string; avatar: string }) => ({
        account: { id, avatar },
      })
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(cleanup);

  function renderFlow(flowType: 'create' | 'recover') {
    return render(
      <PasswordPage
        mnemonic="test mnemonic"
        flowType={flowType}
        onSuccess={vi.fn()}
        onBack={vi.fn()}
        onResetSalmon={mockResetSalmon}
      />
    );
  }

  it('retries with the same wallet id and avatar after a failed save', async () => {
    mockAddAccount.mockRejectedValueOnce(new Error('disk full'));
    renderPage();

    await submitPassword();
    await waitFor(() => expect(screen.getByText(SEED_KEY)).toBeTruthy());
    fireEvent.click(screen.getByTestId('password-submit-button'));
    await waitFor(() => expect(mockAddAccount).toHaveBeenCalledTimes(2));

    const [first, second] = mockAddAccount.mock.calls.map(([account]) => account);
    expect(first).toEqual({ id: expect.any(String), avatar: expect.any(String) });
    expect(second).toEqual(first);
  });

  it('marks a created wallet through the save and a recovered one not at all', async () => {
    accountsState.requiredLock = false;
    const create = renderFlow('create');
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'correct horse battery' },
    });
    fireEvent.change(screen.getByTestId('password-confirm-input'), {
      target: { value: 'correct horse battery' },
    });
    fireEvent.click(screen.getByTestId('password-submit-button'));
    await waitFor(() => expect(mockAddAccount).toHaveBeenCalledTimes(1));
    create.unmount();

    accountsState.requiredLock = true;
    renderPage();
    await submitPassword();
    await waitFor(() => expect(mockAddAccount).toHaveBeenCalledTimes(2));

    expect(mockAddAccount.mock.calls[0]![1]).toBe('correct horse battery');
    expect(mockAddAccount.mock.calls[0]![2]).toEqual({ unconfirmed: true });
    expect(mockAddAccount.mock.calls[1]![2]?.unconfirmed).toBeFalsy();
    expect(mockMarkUnconfirmed).not.toHaveBeenCalled();
  });

  it.each([
    ['a wallet already in the list', new DuplicateAccountError(), 'wallet.import.errors.duplicate'],
    [
      'a password that does not open the vault',
      new IncorrectPasswordError(),
      'wallet.create.invalid_password',
    ],
    [
      'a password check still waiting out a penalty',
      new UnlockThrottledError(5000),
      'errors.password_throttled',
    ],
  ])('says so for %s', async (_, refusal, key) => {
    mockAddAccount.mockRejectedValueOnce(refusal);
    renderPage();

    await submitPassword();

    await waitFor(() => expect(screen.getByText(key)).toBeTruthy());
    expect(screen.queryByText(SEED_KEY)).toBeNull();
  });

  it('shows no error once the save resolved', async () => {
    renderPage();

    await submitPassword();
    await waitFor(() => expect(mockAddAccount).toHaveBeenCalledTimes(1));

    expect(screen.queryByText(SEED_KEY)).toBeNull();
    expect(screen.queryByText(NETWORK_KEY)).toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });
});

/**
 * A save refused because storage read in a way that contradicts the rest
 * shows one dialog with a way out: close, or the lock screen's two-step reset.
 */
describe('PasswordPage when the save is refused', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountsState.requiredLock = true;
    mockCheckPassword.mockResolvedValue(true);
    mockResetSalmon.mockResolvedValue(undefined);
    mockCreateAccount.mockImplementation(
      async ({ id, avatar }: { id: string; avatar: string }) => ({
        account: { id, avatar },
      })
    );
    mockAddAccount.mockRejectedValueOnce(
      new VaultReadRefusedError('The stored wallet list is unreadable')
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(cleanup);

  async function pressWhenAlone(testID: string) {
    await waitFor(() => expect(screen.getAllByTestId(testID)).toHaveLength(1));
    fireEvent.click(screen.getByTestId(testID));
  }

  const gone = (text: string) => waitFor(() => expect(screen.queryByText(text)).toBeNull());

  async function refuse() {
    renderPage();
    await submitPassword();
    expect(await screen.findByText('lock.vault_refused_title')).toBeTruthy();
  }

  it('shows the refusal instead of the seed-phrase message', async () => {
    await refuse();
    expect(screen.queryByText(SEED_KEY)).toBeNull();
  });

  it('closes on close and erases nothing', async () => {
    await refuse();
    fireEvent.click(screen.getByTestId('vault-refused-close-button'));

    await gone('lock.vault_refused_title');
    expect(mockResetSalmon).not.toHaveBeenCalled();
  });

  it('resets Salmon after both reset sheets, once', async () => {
    await refuse();
    fireEvent.click(screen.getByTestId('vault-refused-reset-button'));
    await gone('lock.vault_refused_title');
    await pressWhenAlone('confirm-dialog-confirm');
    await screen.findByText('lock.confirm_title');
    expect(mockResetSalmon).not.toHaveBeenCalled();
    await gone('lock.reset_wallet_title');
    await pressWhenAlone('confirm-dialog-confirm');

    await waitFor(() => expect(mockResetSalmon).toHaveBeenCalledTimes(1));
  });

  it.each([1, 2])('erases nothing when the reset is cancelled at step %i', async (step) => {
    await refuse();
    fireEvent.click(screen.getByTestId('vault-refused-reset-button'));
    await gone('lock.vault_refused_title');
    if (step === 2) {
      await pressWhenAlone('confirm-dialog-confirm');
      await screen.findByText('lock.confirm_title');
      await gone('lock.reset_wallet_title');
    }
    await pressWhenAlone('confirm-dialog-cancel');

    await gone(step === 1 ? 'lock.reset_wallet_title' : 'lock.confirm_title');
    expect(mockResetSalmon).not.toHaveBeenCalled();
  });

  it('keeps the seed-phrase message and no dialog for any other failure', async () => {
    mockAddAccount.mockReset();
    mockAddAccount.mockRejectedValueOnce(new Error('disk full'));
    renderPage();
    await submitPassword();

    await waitFor(() => expect(screen.getByText(SEED_KEY)).toBeTruthy());
    expect(screen.queryByText('lock.vault_refused_title')).toBeNull();
  });
});
