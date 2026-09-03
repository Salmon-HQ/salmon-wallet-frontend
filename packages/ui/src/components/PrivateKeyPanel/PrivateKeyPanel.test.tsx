/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
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

function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

function renderPanel(mode: 'dark' | 'light' = 'dark') {
  stubMatchMedia();
  renderInMode(mode, <PrivateKeyPanel onBack={vi.fn()} />);
}

/** The reveal is gated on the password, so every test has to pay it. */
function reauthenticate(password: string = CORRECT_PASSWORD) {
  fireEvent.change(screen.getByTestId('confirm-dialog-password'), { target: { value: password } });
  fireEvent.click(screen.getByTestId('private-key-reauth-confirm'));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PrivateKeyPanel reveal', () => {
  it('does not hand over the private key to whoever is holding an unlocked session', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('private-key-reveal-overlay-0'));

    // Asking is not enough — the password has to be re-entered.
    expect(screen.queryByText(FAKE_PRIVATE_KEY)).toBeNull();
    expect(screen.getByTestId('confirm-dialog-password')).toBeTruthy();
  });

  it('keeps the key hidden when the password is wrong', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('private-key-reveal-overlay-0'));
    reauthenticate('wrong-password-000');

    await waitFor(() => {
      expect(screen.getByText('Invalid password')).toBeTruthy();
    });
    expect(screen.queryByText(FAKE_PRIVATE_KEY)).toBeNull();
  });

  it('shows the key once the password is re-entered', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('private-key-reveal-overlay-0'));
    reauthenticate();

    await waitFor(() => {
      expect(screen.getByText(FAKE_PRIVATE_KEY)).toBeTruthy();
    });
  });

  it('says the clipboard is readable by other apps before the key goes into it', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('private-key-reveal-overlay-0'));
    reauthenticate();

    await waitFor(() => {
      expect(screen.getByTestId('private-key-clipboard-warning-0')).toBeTruthy();
    });
  });
});

describe('PrivateKeyPanel key exhibition surface', () => {
  it('exhibits the key on bedrock, not on a translucent card, in both modes', () => {
    renderPanel('light');

    const card = screen.getByTestId('private-key-card-0');
    const cover = screen.getByTestId('private-key-reveal-overlay-0');
    const bedrock = asRenderedColor(createSemantic('light').surface.bedrock);

    // A secret shown through a translucent surface is the failure this pins.
    expect(card.style.backgroundColor).toBe(bedrock);
    expect(cover.style.backgroundColor).toBe(bedrock);
    expect(card.style.backgroundColor).not.toContain('rgba');
  });

  it('exposes the cover as a real button with a name that promises the gate', () => {
    renderPanel();

    const overlay = screen.getByTestId('private-key-reveal-overlay-0');
    expect(overlay.tagName).toBe('BUTTON');
    expect(overlay.getAttribute('aria-label')).toBe('settings.authenticate_to_reveal');
  });
});
