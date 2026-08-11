/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BackupPanel } from './BackupPanel';

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
  useAccountsContext: () => [
    { activeAccount: { mnemonic: 'alpha bravo charlie delta echo foxtrot' } },
    {},
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

function renderPanelWithRevealedSeed() {
  render(<BackupPanel onBack={vi.fn()} />);
  fireEvent.click(screen.getByTestId('backup-seed-reveal-button'));
}

describe('BackupPanel seed copy failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('warns when the clipboard write fails so the user does not assume the seed was copied', async () => {
    setClipboardWriteText(() => Promise.reject(new Error('denied')));

    renderPanelWithRevealedSeed();
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

    renderPanelWithRevealedSeed();
    fireEvent.click(screen.getByTestId('backup-seed-copy-button'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('alpha bravo charlie delta echo foxtrot');
    });
    expect(screen.queryByTestId('backup-seed-copy-error')).toBeNull();
  });

  it('clears the warning once a retry succeeds', async () => {
    setClipboardWriteText(() => Promise.reject(new Error('denied')));
    renderPanelWithRevealedSeed();
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
