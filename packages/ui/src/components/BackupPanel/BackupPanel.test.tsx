/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BackupPanel } from './BackupPanel';
import { semantic } from '../../../../shared/src/theme';

/** jsdom reports computed colors as `rgb(...)`; the tokens are authored as hex. */
function rgbOf(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}

/** Obviously fake — no real credential belongs in a test. */
const CORRECT_PASSWORD = 'test-password-000';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// The real @salmon/shared barrel pulls in react-native, which Vite cannot
// parse, so the module is stubbed with the runtime-agnostic theme tokens plus
// the accounts context the panel reads the mnemonic from.
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/theme')),
  ...(await vi.importActual('../../../../shared/src/utils/scaling')),
  ...(await vi.importActual('../../../../shared/src/hooks/useCopyFeedback')),
  ...(await vi.importActual('../../../../shared/src/utils/account-secret')),
  useAccountsContext: () => [
    {
      activeAccount: {
        secret: { kind: 'mnemonic', mnemonic: 'alpha bravo charlie delta echo foxtrot' },
      },
    },
    { checkPassword: (password: string) => Promise.resolve(password === CORRECT_PASSWORD) },
  ],
}));

vi.mock('../../utils/styled', async () => {
  const emotion = await import('@emotion/styled');
  return { styled: emotion.default };
});

function setClipboardWriteText(impl: () => Promise<void>) {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: impl },
    configurable: true,
  });
}

/** The reveal is gated on the password, so every test has to pay it. */
async function reauthenticate(password: string = CORRECT_PASSWORD) {
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByTestId('backup-reauth-confirm'));
}

async function renderPanelWithRevealedSeed() {
  render(<BackupPanel onBack={vi.fn()} />);
  fireEvent.click(screen.getByTestId('backup-seed-reveal-button'));
  await reauthenticate();
  await waitFor(() => {
    expect(screen.getByText('alpha')).toBeTruthy();
  });
}

describe('BackupPanel seed reveal', () => {
  afterEach(cleanup);

  it('does not hand over the phrase to whoever is holding an unlocked session', async () => {
    render(<BackupPanel onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('backup-seed-reveal-button'));

    // Asking is not enough — the password has to be re-entered.
    expect(screen.queryByText('alpha')).toBeNull();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('keeps the phrase hidden when the password is wrong', async () => {
    render(<BackupPanel onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('backup-seed-reveal-button'));
    await reauthenticate('wrong-password-000');

    await waitFor(() => {
      expect(screen.getByText('Invalid password')).toBeTruthy();
    });
    expect(screen.queryByText('alpha')).toBeNull();
  });

  it('says the clipboard is readable by other apps before the seed goes into it', async () => {
    await renderPanelWithRevealedSeed();

    expect(screen.getByTestId('backup-seed-clipboard-warning')).toBeTruthy();
  });
});

describe('BackupPanel seed exhibition surface', () => {
  afterEach(cleanup);

  it('exhibits the phrase on bedrock, not on a translucent card', () => {
    render(<BackupPanel onBack={vi.fn()} />);

    const card = screen.getByTestId('backup-seed-phrase');
    const background = window.getComputedStyle(card).backgroundColor;

    // A secret shown through a translucent surface is the failure this pins.
    expect(background).toBe(rgbOf(semantic.surface.bedrock));
    expect(background).not.toContain('rgba');
  });
});

describe('BackupPanel reveal overlay keyboard access', () => {
  afterEach(cleanup);

  it('exposes the overlay as a focusable button with a name', () => {
    render(<BackupPanel onBack={vi.fn()} />);

    const overlay = screen.getByTestId('backup-seed-reveal-overlay');
    expect(overlay.getAttribute('role')).toBe('button');
    expect(overlay.getAttribute('tabindex')).toBe('0');
    expect(overlay.getAttribute('aria-label')).toBe('Tap to reveal');
  });

  it('opens the same password gate from the keyboard as from a click', () => {
    render(<BackupPanel onBack={vi.fn()} />);
    fireEvent.keyDown(screen.getByTestId('backup-seed-reveal-overlay'), { key: 'Enter' });

    // Keyboard reaches the gate, and the gate still holds.
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.queryByText('alpha')).toBeNull();
  });

  it('ignores keys that are not activation keys', () => {
    render(<BackupPanel onBack={vi.fn()} />);
    fireEvent.keyDown(screen.getByTestId('backup-seed-reveal-overlay'), { key: 'a' });

    expect(screen.queryByLabelText('Password')).toBeNull();
  });
});

describe('BackupPanel seed copy failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('warns when the clipboard write fails so the user does not assume the seed was copied', async () => {
    setClipboardWriteText(() => Promise.reject(new Error('denied')));

    await renderPanelWithRevealedSeed();
    fireEvent.click(screen.getByTestId('backup-seed-copy-button'));

    await waitFor(() => {
      expect(screen.getByTestId('backup-seed-copy-error')).toBeTruthy();
    });
    // The i18n stub echoes keys, pinning which message is requested.
    expect(screen.getByText('settings.copy_failed')).toBeTruthy();
  });

  it('shows no warning when the clipboard write succeeds', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    setClipboardWriteText(writeText);

    await renderPanelWithRevealedSeed();
    fireEvent.click(screen.getByTestId('backup-seed-copy-button'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('alpha bravo charlie delta echo foxtrot');
    });
    expect(screen.queryByTestId('backup-seed-copy-error')).toBeNull();
  });

  it('clears the warning once a retry succeeds', async () => {
    setClipboardWriteText(() => Promise.reject(new Error('denied')));
    await renderPanelWithRevealedSeed();
    fireEvent.click(screen.getByTestId('backup-seed-copy-button'));
    await waitFor(() => {
      expect(screen.getByTestId('backup-seed-copy-error')).toBeTruthy();
    });

    setClipboardWriteText(() => Promise.resolve());
    fireEvent.click(screen.getByTestId('backup-seed-copy-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('backup-seed-copy-error')).toBeNull();
    });
  });
});
