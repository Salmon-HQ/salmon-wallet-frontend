/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { BackupPanel } from './BackupPanel';

/** Obviously fake — no real credential belongs in a test. */
const CORRECT_PASSWORD = 'test-password-000';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// The real barrel loads fine under vitest; only the accounts context the
// panel reads the mnemonic from needs to be stubbed for a deterministic seed.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useAccountsContext: () => [
    {
      activeAccount: {
        secret: { kind: 'mnemonic', mnemonic: 'alpha bravo charlie delta echo foxtrot' },
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

function setClipboardWriteText(impl: () => Promise<void>) {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: impl },
    configurable: true,
  });
}

function renderPanel(mode: 'dark' | 'light' = 'dark') {
  stubMatchMedia();
  renderInMode(mode, <BackupPanel onBack={vi.fn()} />);
}

/** The reveal is gated on the password, so every test has to pay it. */
function reauthenticate(password: string = CORRECT_PASSWORD) {
  fireEvent.change(screen.getByTestId('confirm-dialog-password'), { target: { value: password } });
  fireEvent.click(screen.getByTestId('backup-reauth-confirm'));
}

async function renderPanelWithRevealedSeed() {
  renderPanel();
  fireEvent.click(screen.getByTestId('backup-seed-reveal-overlay'));
  reauthenticate();
  await waitFor(() => {
    expect(screen.getByText('alpha')).toBeTruthy();
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BackupPanel seed reveal', () => {
  it('does not hand over the phrase to whoever is holding an unlocked session', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('backup-seed-reveal-overlay'));

    // Asking is not enough — the password has to be re-entered.
    expect(screen.queryByText('alpha')).toBeNull();
    expect(screen.getByTestId('confirm-dialog-password')).toBeTruthy();
  });

  it('keeps the phrase hidden when the password is wrong', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('backup-seed-reveal-overlay'));
    reauthenticate('wrong-password-000');

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

describe('BackupPanel reveal gate', () => {
  it('covers the phrase with opaque bedrock, not a translucent scrim, in both modes', () => {
    renderPanel('light');

    const cover = screen.getByTestId('backup-seed-reveal-overlay');
    expect(cover.tagName).toBe('BUTTON');
    expect(cover.getAttribute('aria-label')).toBe('settings.wallets.tap_to_reveal');
    // A secret shown through a translucent surface is the failure this pins.
    expect(cover.style.backgroundColor).toBe(
      asRenderedColor(createSemantic('light').surface.bedrock)
    );
    expect(cover.style.backgroundColor).not.toContain('rgba');
  });

  it('opens the same password gate from the keyboard as from a click', () => {
    renderPanel();
    fireEvent.keyDown(screen.getByTestId('backup-seed-reveal-overlay'), { key: 'Enter' });
    fireEvent.click(screen.getByTestId('backup-seed-reveal-overlay'));

    // The gate holds either way.
    expect(screen.getByTestId('confirm-dialog-password')).toBeTruthy();
    expect(screen.queryByText('alpha')).toBeNull();
  });
});

describe('BackupPanel seed copy failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
