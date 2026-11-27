/**
 * Removing a wallet that storage refuses to change shows one dialog with a way
 * out: close, or the lock screen's two-step reset, each sheet opening once the
 * one before it has left. Any other failure keeps the removal sheet open, as
 * it was.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VaultReadRefusedError } from '@salmon/shared';

const { mockRemove, mockRemoveAllAccounts, mockClearSessionKey } = vi.hoisted(() => ({
  mockRemove: vi.fn(),
  mockRemoveAllAccounts: vi.fn(),
  mockClearSessionKey: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useAccountsContext: () => [
    { activeAccount: { id: 'wallet-2' }, activeBlockchainAccount: null, networkId: null },
    { removeAllAccounts: mockRemoveAllAccounts },
  ],
  useAccountRemoval: () => ({
    requiresPassword: false,
    validatePassword: vi.fn().mockResolvedValue(true),
    remove: mockRemove,
  }),
  useAnalyticsConsent: () => ({ consent: false, setConsent: vi.fn() }),
  useCurrencyContext: () => [{ currency: 'USD' }],
  useLanguage: () => ({ currentLanguage: 'en' }),
  useTheme: () => ({ preference: 'system' }),
  useTokenListLabels: () => ({ rowValue: '' }),
  useUserConfig: () => ({ explorer: null }),
}));

vi.mock('../../settings/panelRegistry', () => ({ useSettingsPanelRegistry: () => ({}) }));

vi.mock('../../utils/sessionKeyCache', () => ({
  clearSessionKey: () => mockClearSessionKey(),
}));

vi.mock('../../components', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../components')>()),
  SettingsPanelStack: ({ onRemoveWallet }: { onRemoveWallet: () => void }) => (
    <button data-testid="settings-remove-wallet" onClick={onRemoveWallet} />
  ),
}));

import { SettingsPage } from './SettingsPage';

const click = (testID: string) => fireEvent.click(screen.getByTestId(testID));

const gone = (text: string) => waitFor(() => expect(screen.queryByText(text)).toBeNull());

async function removeWallet() {
  render(<SettingsPage onClose={vi.fn()} />);
  fireEvent.click(screen.getByTestId('settings-remove-wallet'));
  fireEvent.change(screen.getByTestId('confirm-dialog-password'), {
    target: { value: 'hunter2-hunter2' },
  });
  fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
}

/** Presses `testID`; `next` shows only once the sheet before it has left. */
async function pressThenWait(testID: string, next: string) {
  click(testID);
  expect(screen.queryByText(next)).toBeNull();
  await screen.findByText(next);
}

async function refuse() {
  await removeWallet();
  await waitFor(() => expect(mockRemove).toHaveBeenCalledTimes(1));
  await act(async () => {});
  // The removal sheet is leaving: the refusal waits for it to go.
  expect(screen.queryByText('lock.vault_refused_title')).toBeNull();
  expect(await screen.findByText('lock.vault_refused_title')).toBeTruthy();
  expect(screen.queryByText('settings.remove_wallet')).toBeNull();
}

describe('SettingsPage when a removal is refused', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockRemoveAllAccounts.mockResolvedValue(undefined);
    mockClearSessionKey.mockResolvedValue(undefined);
    mockRemove.mockRejectedValue(
      new VaultReadRefusedError('The stored wallet list reads empty while wallets are open')
    );
  });

  it('shows the refusal in place of the removal sheet', async () => {
    await refuse();
    await gone('settings.remove_wallet');
    expect(mockRemove).toHaveBeenCalledWith('wallet-2', 'hunter2-hunter2');
  });

  it('closes on close and erases nothing', async () => {
    await refuse();
    fireEvent.click(screen.getByTestId('vault-refused-close-button'));

    await gone('lock.vault_refused_title');
    expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
    expect(mockClearSessionKey).not.toHaveBeenCalled();
  });

  it('resets Salmon after both reset sheets, once', async () => {
    await refuse();
    await pressThenWait('vault-refused-reset-button', 'lock.reset_wallet_title');
    await pressThenWait('confirm-dialog-confirm', 'lock.confirm_title');
    expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
    click('confirm-dialog-confirm');

    await waitFor(() => expect(mockRemoveAllAccounts).toHaveBeenCalledTimes(1));
    expect(mockClearSessionKey).toHaveBeenCalledTimes(1);
  });

  it.each([1, 2])('erases nothing when the reset is cancelled at step %i', async (step) => {
    await refuse();
    await pressThenWait('vault-refused-reset-button', 'lock.reset_wallet_title');
    if (step === 2) await pressThenWait('confirm-dialog-confirm', 'lock.confirm_title');
    click('confirm-dialog-cancel');

    await gone(step === 1 ? 'lock.reset_wallet_title' : 'lock.confirm_title');
    expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
  });

  it('keeps the removal sheet open and shows no dialog for any other failure', async () => {
    mockRemove.mockRejectedValue(new Error('disk full'));
    await removeWallet();

    await waitFor(() => expect(mockRemove).toHaveBeenCalledTimes(1));
    expect(screen.getByText('settings.remove_wallet')).toBeTruthy();
    expect(screen.queryByText('lock.vault_refused_title')).toBeNull();
  });
});
