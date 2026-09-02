/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@salmon/shared/utils/account', () => ({
  generateAccountName: () => 'Account #1',
}));

// The real barrel now loads fine under vitest (react-native is aliased to a
// stub); only the account-setup surface below needs deterministic control.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  PASSWORD_CONSTRAINTS: { MIN_LENGTH: 12, MAX_LENGTH: 128 },
  ApiError: MockApiError,
  createAccount: (...args: unknown[]) => mockCreateAccount(...args),
  getScanNetworks: async () => ['solana'],
  getMirrorNetworks: async () => ({}),
  trackOnboardingEvent: async () => undefined,
  useAccountsContext: () => [
    accountsState,
    { checkPassword: mockCheckPassword, addAccount: mockAddAccount },
  ],
  validatePassword: () => ({ isValid: true, strength: 'strong' }),
  getPasswordIssue: () => null,
  getPasswordStrengthLabel: (strength: string) => `strength-${strength}`,
}));

function renderPage() {
  return render(
    <PasswordPage
      mnemonic="test mnemonic"
      flowType="recover"
      onSuccess={vi.fn()}
      onBack={vi.fn()}
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
    expect(screen.getByText('strength-strong')).toBeTruthy();
  });

  it('reveals the strength meter in place on the first character', () => {
    const { container } = renderPage();

    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'a' } });

    // The strength slot flipped visible; the error slot is still reserved.
    expect(container.querySelectorAll('div[inert]')).toHaveLength(1);
    expect(screen.getByText('strength-strong')).toBeTruthy();
  });
});
