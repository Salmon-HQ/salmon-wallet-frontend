/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrivateKeyPanel } from './PrivateKeyPanel';
import { semantic } from '../../../../shared/src/theme';

/** jsdom reports computed colors as `rgb(...)`; the tokens are authored as hex. */
function rgbOf(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}

/** Obviously fake — no real credential belongs in a test. */
const CORRECT_PASSWORD = 'test-password-000';
const FAKE_PRIVATE_KEY = 'fake-private-key-000-not-a-real-key';
const FAKE_ADDRESS = 'FakeAddress1111111111111111111111111111111';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// The real barrel, with only the accounts context overridden so the panel's
// reveal/reauth flow is deterministic under test.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useAccountsContext: () => [
    {
      activeAccount: {
        networksAccounts: {
          'solana-mainnet': [
            {
              path: "m/44'/501'/0'/0'",
              getReceiveAddress: () => FAKE_ADDRESS,
              retrieveSecurePrivateKey: () => FAKE_PRIVATE_KEY,
              // getAccountKeysForNetwork skips accounts that cannot sign, so
              // the mock has to declare it the way a real SolanaAccount does.
              canSign: true as const,
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

describe('PrivateKeyPanel key exhibition surface', () => {
  afterEach(cleanup);

  it('exhibits the key on bedrock, not on a translucent card', () => {
    render(<PrivateKeyPanel onBack={vi.fn()} />);

    const card = screen.getByTestId('private-key-card-0');
    const background = window.getComputedStyle(card).backgroundColor;

    // A secret shown through a translucent surface is the failure this pins.
    expect(background).toBe(rgbOf(semantic.surface.bedrock));
    expect(background).not.toContain('rgba');
  });
});

describe('PrivateKeyPanel reveal overlay keyboard access', () => {
  afterEach(cleanup);

  it('exposes the overlay as a focusable button with a name', () => {
    render(<PrivateKeyPanel onBack={vi.fn()} />);

    const overlay = screen.getByTestId('private-key-reveal-overlay-0');
    expect(overlay.getAttribute('role')).toBe('button');
    expect(overlay.getAttribute('tabindex')).toBe('0');
    expect(overlay.getAttribute('aria-label')).toBe('Tap to reveal');
  });

  it('opens the same password gate from the keyboard as from a click', () => {
    render(<PrivateKeyPanel onBack={vi.fn()} />);
    fireEvent.keyDown(screen.getByTestId('private-key-reveal-overlay-0'), { key: ' ' });

    // Keyboard reaches the gate, and the gate still holds.
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.queryByText(FAKE_PRIVATE_KEY)).toBeNull();
  });

  it('ignores keys that are not activation keys', () => {
    render(<PrivateKeyPanel onBack={vi.fn()} />);
    fireEvent.keyDown(screen.getByTestId('private-key-reveal-overlay-0'), { key: 'a' });

    expect(screen.queryByLabelText('Password')).toBeNull();
  });
});
