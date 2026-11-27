/**
 * A refused save explains itself and offers a way out: close, or reset Salmon
 * through the lock screen's two sheets, one at a time. Nothing is erased
 * before the second sheet is confirmed.
 */
import React, { useState } from 'react';
import { AccessibilityInfo, Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../ConfirmSheet', () => ({
  ConfirmSheet: jest.requireActual('../../../test-utils/confirmSheetStandIn').ConfirmSheetStandIn,
}));

import { finishClosing } from '../../../test-utils/confirmSheetStandIn';
import { VaultRefusedDialog } from './VaultRefusedDialog';

function Host({ onReset }: { onReset: () => Promise<void> }) {
  const [refused, setRefused] = useState(true);
  return (
    <VaultRefusedDialog visible={refused} onClose={() => setRefused(false)} onReset={onReset} />
  );
}

const press = (testID: string) => act(async () => fireEvent.press(screen.getByTestId(testID)));
const leave = () => act(() => finishClosing());

/** Presses `testID`; `next` shows only once the pressed sheet has left. */
async function pressThenLeave(testID: string, next: string) {
  await press(testID);
  expect(screen.queryByText(next)).toBeNull();
  await leave();
  expect(screen.getByText(next)).toBeTruthy();
}

describe('VaultRefusedDialog', () => {
  it('says the save was refused, with close and reset', () => {
    render(<Host onReset={jest.fn()} />);

    expect(screen.getByText('lock.vault_refused_title')).toBeTruthy();
    expect(screen.getByText('lock.vault_refused_message')).toBeTruthy();
    expect(screen.getByTestId('vault-refused-close-button')).toHaveTextContent('actions.close');
    expect(screen.getByTestId('vault-refused-reset-button')).toHaveTextContent('lock.reset_salmon');
  });

  // It opens by itself after a failed save, so a screen reader is told why.
  it('says its title aloud when it opens', () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    render(<Host onReset={jest.fn()} />);

    expect(announce).toHaveBeenCalledWith('lock.vault_refused_title');
    announce.mockRestore();
  });

  it('closes on close and erases nothing', async () => {
    const onReset = jest.fn();
    render(<Host onReset={onReset} />);

    await press('vault-refused-close-button');
    await leave();

    expect(screen.queryByText('lock.vault_refused_title')).toBeNull();
    expect(screen.queryByText('lock.reset_wallet_title')).toBeNull();
    expect(onReset).not.toHaveBeenCalled();
  });

  it('resets only after the warning and the last word, once', async () => {
    const onReset = jest.fn().mockResolvedValue(undefined);
    render(<Host onReset={onReset} />);

    await press('vault-refused-reset-button');
    expect(screen.queryByText('lock.vault_refused_title')).toBeNull();
    expect(screen.queryByText('lock.reset_wallet_title')).toBeNull();
    await leave();
    expect(screen.getByText('lock.reset_wallet_title')).toBeTruthy();

    await pressThenLeave('confirm-dialog-confirm', 'lock.confirm_title');
    expect(screen.queryByText('lock.reset_wallet_title')).toBeNull();
    expect(onReset).not.toHaveBeenCalled();

    await press('confirm-dialog-confirm');
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('lock.confirm_title')).toBeNull();
  });

  it('erases nothing when the warning is cancelled', async () => {
    const onReset = jest.fn();
    render(<Host onReset={onReset} />);

    await pressThenLeave('vault-refused-reset-button', 'lock.reset_wallet_title');
    await press('confirm-dialog-cancel');
    await leave();

    expect(screen.queryByText('lock.reset_wallet_title')).toBeNull();
    expect(screen.queryByText('lock.confirm_title')).toBeNull();
    expect(onReset).not.toHaveBeenCalled();
  });

  it('erases nothing when the last word is cancelled', async () => {
    const onReset = jest.fn();
    render(<Host onReset={onReset} />);

    await pressThenLeave('vault-refused-reset-button', 'lock.reset_wallet_title');
    await pressThenLeave('confirm-dialog-confirm', 'lock.confirm_title');
    await press('confirm-dialog-cancel');
    await leave();

    expect(screen.queryByText('lock.confirm_title')).toBeNull();
    expect(onReset).not.toHaveBeenCalled();
  });

  it("says the lock screen's failure message when the reset fails", async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<Host onReset={jest.fn().mockRejectedValue(new Error('storage gone'))} />);

    await pressThenLeave('vault-refused-reset-button', 'lock.reset_wallet_title');
    await pressThenLeave('confirm-dialog-confirm', 'lock.confirm_title');
    await press('confirm-dialog-confirm');

    expect(alert).toHaveBeenCalledWith('general.error', 'lock.reset_failed');
  });
});
