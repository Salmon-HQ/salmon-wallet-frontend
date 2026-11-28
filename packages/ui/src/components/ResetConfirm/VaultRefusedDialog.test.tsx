/**
 * @vitest-environment jsdom
 *
 * A refused save explains itself and offers a way out: close, or reset Salmon
 * through the lock screen's two sheets. Each sheet opens once the one before
 * it has left, so a fast click never lands on the next one's danger button,
 * and nothing is erased before the second sheet is confirmed.
 */
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VaultRefusedDialog } from './VaultRefusedDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

/** The owner's side: the dialog shows while `refused` holds, as the screens keep it. */
function Host({ onReset }: { onReset: () => Promise<void> }) {
  const [refused, setRefused] = useState(true);
  return (
    <VaultRefusedDialog visible={refused} onClose={() => setRefused(false)} onReset={onReset} />
  );
}

const click = (testID: string) => fireEvent.click(screen.getByTestId(testID));

/**
 * Presses `testID`, then checks the sheet titled `next` is not there while the
 * pressed one leaves, and arrives only after it has gone.
 */
async function pressThenWait(testID: string, leaving: string, next: string) {
  click(testID);
  expect(screen.queryByText(next)).toBeNull();
  expect(await screen.findByText(next)).toBeTruthy();
  expect(screen.queryByText(leaving)).toBeNull();
}

async function gone(text: string) {
  await waitFor(() => expect(screen.queryByText(text)).toBeNull());
}

describe('VaultRefusedDialog', () => {
  it('says the save was refused, with close and reset, named by its title', () => {
    render(<Host onReset={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'lock.vault_refused_title' })).toBeTruthy();
    expect(screen.getByText('lock.vault_refused_message')).toBeTruthy();
    expect(screen.getByTestId('vault-refused-close-button').textContent).toBe('actions.close');
    expect(screen.getByTestId('vault-refused-reset-button').textContent).toBe('lock.reset_salmon');
  });

  it('closes on close and erases nothing', async () => {
    const onReset = vi.fn();
    render(<Host onReset={onReset} />);

    click('vault-refused-close-button');
    await gone('lock.vault_refused_title');
    expect(screen.queryByText('lock.reset_wallet_title')).toBeNull();
    expect(onReset).not.toHaveBeenCalled();
  });

  it('resets only after the warning and the last word, each after the one before has left', async () => {
    const onReset = vi.fn().mockResolvedValue(undefined);
    render(<Host onReset={onReset} />);

    await pressThenWait(
      'vault-refused-reset-button',
      'lock.vault_refused_title',
      'lock.reset_wallet_title'
    );
    await pressThenWait('confirm-dialog-confirm', 'lock.reset_wallet_title', 'lock.confirm_title');
    expect(onReset).not.toHaveBeenCalled();

    click('confirm-dialog-confirm');
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(1));
    await gone('lock.confirm_title');
  });

  it('lets no fast click on the same spot reach the next sheet', async () => {
    const onReset = vi.fn().mockResolvedValue(undefined);
    render(<Host onReset={onReset} />);

    click('vault-refused-reset-button');
    // The refusal is leaving: its button is the only danger button there.
    expect(screen.queryAllByTestId('confirm-dialog-confirm')).toHaveLength(0);
    click('vault-refused-reset-button');
    await screen.findByText('lock.reset_wallet_title');

    click('confirm-dialog-confirm');
    click('confirm-dialog-confirm');
    click('confirm-dialog-confirm');
    expect(screen.queryByText('lock.confirm_title')).toBeNull();
    expect(screen.getAllByTestId('confirm-dialog-confirm')).toHaveLength(1);
    await screen.findByText('lock.confirm_title');
    expect(screen.getAllByTestId('confirm-dialog-confirm')).toHaveLength(1);
    expect(onReset).not.toHaveBeenCalled();
  });

  it('erases once even when the last word is clicked again as it leaves', async () => {
    const onReset = vi.fn().mockResolvedValue(undefined);
    render(<Host onReset={onReset} />);
    click('vault-refused-reset-button');
    await screen.findByText('lock.reset_wallet_title');
    click('confirm-dialog-confirm');
    await screen.findByText('lock.confirm_title');

    click('confirm-dialog-confirm');
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(1));
    click('confirm-dialog-confirm');
    await gone('lock.confirm_title');
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('erases nothing when the warning is cancelled', async () => {
    const onReset = vi.fn();
    render(<Host onReset={onReset} />);
    click('vault-refused-reset-button');
    await screen.findByText('lock.reset_wallet_title');

    click('confirm-dialog-cancel');
    await gone('lock.reset_wallet_title');
    expect(screen.queryByText('lock.confirm_title')).toBeNull();
    expect(onReset).not.toHaveBeenCalled();
  });

  it('erases nothing when the last word is cancelled', async () => {
    const onReset = vi.fn();
    render(<Host onReset={onReset} />);
    click('vault-refused-reset-button');
    await screen.findByText('lock.reset_wallet_title');
    click('confirm-dialog-confirm');
    await screen.findByText('lock.confirm_title');

    click('confirm-dialog-cancel');
    await gone('lock.confirm_title');
    expect(onReset).not.toHaveBeenCalled();
  });

  it("shows the lock screen's failure message when the reset fails, and lets it be retried", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onReset = vi.fn().mockRejectedValue(new Error('storage gone'));
    render(<Host onReset={onReset} />);
    click('vault-refused-reset-button');
    await screen.findByText('lock.reset_wallet_title');
    click('confirm-dialog-confirm');
    await screen.findByText('lock.confirm_title');

    click('confirm-dialog-confirm');
    expect(await screen.findByText('lock.reset_failed')).toBeTruthy();
    click('confirm-dialog-confirm');
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(2));
  });
});
