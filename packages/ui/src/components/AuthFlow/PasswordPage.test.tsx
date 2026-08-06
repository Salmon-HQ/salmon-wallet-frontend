/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PasswordPage } from './PasswordPage';

// Hoisted so the vi.mock factory below can reference it — vi.mock is lifted
// above every top-level statement in this file.
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

// The real @salmon/shared barrel pulls in react-native, which Vite cannot
// parse, so the module is stubbed. Pull the design tokens from the theme and
// scaling modules directly — they are runtime-agnostic — instead of hand-
// writing the long tail LoadingScreen and the inputs read.
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/theme')),
  ...(await vi.importActual('../../../../shared/src/utils/scaling')),
  ...(await vi.importActual('../../../../shared/src/types/ui')),
  PASSWORD_CONSTRAINTS: { MIN_LENGTH: 12, MAX_LENGTH: 128 },
  ApiError: MockApiError,
  createAccount: (...args: unknown[]) => mockCreateAccount(...args),
  getScanNetworks: async () => ['solana'],
  getMirrorNetworks: async () => ({}),
  trackEvent: () => undefined,
  useAccountsContext: () => [
    { requiredLock: true, counter: 0 },
    { checkPassword: mockCheckPassword, addAccount: mockAddAccount },
  ],
  validatePassword: () => ({ isValid: true, strength: 'strong' }),
  getPasswordIssue: () => null,
}));

vi.mock('../../utils/styled', async () => {
  const emotion = await import('@emotion/styled');
  return { styled: emotion.default };
});

function renderPage() {
  return render(
    <PasswordPage
      mnemonic="test mnemonic"
      flowType="recover"
      onSuccess={vi.fn()}
      onBack={vi.fn()}
    />,
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
    mockCheckPassword.mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(cleanup);

  it('blames the connection, not the seed phrase, when the server is unreachable', async () => {
    mockCreateAccount.mockRejectedValue(
      new MockApiError('Network error: Unable to reach the server', 0),
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
