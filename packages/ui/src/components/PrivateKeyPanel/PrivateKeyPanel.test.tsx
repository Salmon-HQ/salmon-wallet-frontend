/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrivateKeyPanel } from './PrivateKeyPanel';

/** Obviously fake — no real credential belongs in a test. */
const CORRECT_PASSWORD = 'test-password-000';
const FAKE_PRIVATE_KEY = 'fake-private-key-000-not-a-real-key';
const FAKE_ADDRESS = 'FakeAddress1111111111111111111111111111111';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// The real @salmon/shared barrel pulls in react-native, which Vite cannot
// parse, so the module is stubbed with the runtime-agnostic theme tokens plus
// the accounts context the panel reads the keys from.
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/theme')),
  ...(await vi.importActual('../../../../shared/src/utils/scaling')),
  getShortAddress: (address: string) => address.slice(0, 8),
  useAccountsContext: () => [
    {
      activeAccount: {
        networksAccounts: {
          'solana-mainnet': [
            {
              path: "m/44'/501'/0'/0'",
              getReceiveAddress: () => FAKE_ADDRESS,
              retrieveSecurePrivateKey: () => FAKE_PRIVATE_KEY,
            },
          ],
        },
      },
    },
    { checkPassword: (password: string) => Promise.resolve(password === CORRECT_PASSWORD) },
  ],
}));

vi.mock('../../utils/styled', async () => {
  const emotion = await import('@emotion/styled');
  return { styled: emotion.default };
});

/** The reveal is gated on the password, so every test has to pay it. */
function reauthenticate(password: string = CORRECT_PASSWORD) {
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByTestId('private-key-reauth-confirm'));
}

describe('PrivateKeyPanel reveal', () => {
  afterEach(cleanup);

  it('does not hand over the private key to whoever is holding an unlocked session', () => {
    render(<PrivateKeyPanel onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('private-key-reveal-button-0'));

    // Asking is not enough — the password has to be re-entered.
    expect(screen.queryByText(FAKE_PRIVATE_KEY)).toBeNull();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('keeps the key hidden when the password is wrong', async () => {
    render(<PrivateKeyPanel onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('private-key-reveal-button-0'));
    reauthenticate('wrong-password-000');

    await waitFor(() => {
      expect(screen.getByText('Invalid password')).toBeTruthy();
    });
    expect(screen.queryByText(FAKE_PRIVATE_KEY)).toBeNull();
  });

  it('shows the key once the password is re-entered', async () => {
    render(<PrivateKeyPanel onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('private-key-reveal-button-0'));
    reauthenticate();

    await waitFor(() => {
      expect(screen.getByText(FAKE_PRIVATE_KEY)).toBeTruthy();
    });
  });

  it('gates the blur overlay on the password too, not only the reveal button', () => {
    render(<PrivateKeyPanel onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('private-key-reveal-overlay-0'));

    expect(screen.queryByText(FAKE_PRIVATE_KEY)).toBeNull();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('says the clipboard is readable by other apps before the key goes into it', async () => {
    render(<PrivateKeyPanel onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('private-key-reveal-button-0'));
    reauthenticate();

    await waitFor(() => {
      expect(screen.getByTestId('private-key-clipboard-warning-0')).toBeTruthy();
    });
  });
});
