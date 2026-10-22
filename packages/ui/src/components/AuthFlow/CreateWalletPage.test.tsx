/**
 * @vitest-environment jsdom
 *
 * Creating a wallet: the optional copy of the new phrase goes through the
 * clipboard Salmon clears, and the screen says when it is cleared.
 */
import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { CreateWalletPage } from './CreateWalletPage';

// The public BIP-39 test vector: no real phrase belongs in a test.
const PHRASE =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  generateMnemonic: () => PHRASE,
}));

afterEach(cleanup);

describe('CreateWalletPage seed-phrase copy', () => {
  it('copies the phrase and says when Salmon clears the clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderInMode('dark', <CreateWalletPage onComplete={vi.fn()} onBack={vi.fn()} />);

    // The warning step unlocks once its copy has been scrolled to the end.
    fireEvent.scroll(screen.getByText('wallet.create.messageBody').parentElement!);
    fireEvent.click(screen.getByTestId('seed-warning-continue-button'));
    expect(screen.queryByTestId('create-seed-clipboard-clears')).toBeNull();

    // A keyboard activation commits the hold at once (detail 0).
    fireEvent.click(screen.getByTestId('create-copy-seed-button'), { detail: 0 });

    await waitFor(() => {
      expect(screen.getByTestId('create-seed-clipboard-clears')).toBeTruthy();
    });
    expect(writeText).toHaveBeenCalledWith(PHRASE);
    expect(screen.getByText('settings.secret_copied')).toBeTruthy();
  });
});
