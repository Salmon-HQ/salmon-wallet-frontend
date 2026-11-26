/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { DuplicateAccountError } from '@salmon/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { AccountAddPanel } from './AccountAddPanel';

const { mockAddAccount, privateKeyImport, watchOnlyImport } = vi.hoisted(() => ({
  mockAddAccount: vi.fn(),
  privateKeyImport: {
    value: '',
    setValue: vi.fn(),
    error: null as string | null,
    address: null as string | null,
    privateKey: null as string | null,
    validating: false,
    hasInput: false,
    validate: vi.fn(),
    reset: vi.fn(),
    networkId: 'solana-mainnet',
  },
  watchOnlyImport: {
    value: '',
    setValue: vi.fn(),
    error: null as string | null,
    address: null as string | null,
    hasInput: false,
    validate: vi.fn(),
    reset: vi.fn(),
    networkId: 'solana-mainnet',
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The flow is the real shared `useAccountAddFlow`; the modules it reaches for
// are stubbed at their own paths, so the panel and the hook see the same stub.
vi.mock('../../../../shared/src/contexts/AccountsContext', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAccountsContext: () => [
    { accounts: [{ id: 'a1' }, { id: 'a2' }], activeAccount: null, counter: 2 },
    { addAccount: mockAddAccount, checkPassword: vi.fn(), getNetworkId: () => 'solana-mainnet' },
  ],
}));
vi.mock('../../../../shared/src/hooks/useImportPrivateKey', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useImportPrivateKey: () => privateKeyImport,
}));
vi.mock('../../../../shared/src/hooks/useImportWatchOnly', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useImportWatchOnly: () => watchOnlyImport,
}));
vi.mock('../../../../shared/src/factories/account-factory', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  importAccountFromPrivateKey: vi.fn().mockResolvedValue({ account: { id: 'imported-1' } }),
  importWatchOnlyAccount: vi.fn().mockResolvedValue({ account: { id: 'watched-1' } }),
}));
vi.mock('../../../../shared/src/crypto/encrypt-mnemonics', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  isVaultKeyCached: () => Promise.resolve(true),
}));

function renderPanel() {
  renderInMode(
    'dark',
    <AccountAddPanel
      onComplete={vi.fn()}
      onBack={vi.fn()}
      onWait={vi.fn()}
      onCloseSettings={vi.fn()}
    />
  );
}

async function confirmPrivateKey() {
  privateKeyImport.hasInput = true;
  privateKeyImport.privateKey = 'base58-secret-key';
  privateKeyImport.validate.mockResolvedValue(true);
  renderPanel();
  fireEvent.click(screen.getByTestId('account-add-method-private-key'));
  fireEvent.click(screen.getByTestId('account-add-private-key-continue-button'));
  await waitFor(() => expect(screen.getByTestId('account-add-confirm-button')).toBeTruthy());
  await act(async () => {
    fireEvent.click(screen.getByTestId('account-add-confirm-button'));
  });
}

describe('AccountAddPanel failure notice', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    privateKeyImport.hasInput = false;
    privateKeyImport.privateKey = null;
    watchOnlyImport.hasInput = false;
    watchOnlyImport.address = null;
  });

  it('says the wallet is already in the list when the save refuses an imported key as a duplicate', async () => {
    mockAddAccount.mockRejectedValueOnce(new DuplicateAccountError());

    await confirmPrivateKey();

    await waitFor(() => expect(screen.getByText('wallet.import.errors.duplicate')).toBeTruthy());
    expect(screen.getByText('general.error')).toBeTruthy();
    expect(screen.queryByText('settings.account_add.creation_error')).toBeNull();
  });

  it('says the address is already watched when the save refuses a watched address as a duplicate', async () => {
    watchOnlyImport.hasInput = true;
    watchOnlyImport.address = 'Watched1111111111111111111111111111';
    watchOnlyImport.validate.mockReturnValue(true);
    mockAddAccount.mockRejectedValueOnce(new DuplicateAccountError());

    renderPanel();
    fireEvent.click(screen.getByTestId('account-add-method-watch-only'));
    fireEvent.click(screen.getByTestId('account-add-watch-only-continue-button'));
    await waitFor(() => expect(screen.getByTestId('account-add-confirm-button')).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByTestId('account-add-confirm-button'));
    });

    await waitFor(() => expect(screen.getByText('wallet.watchOnly.errors.duplicate')).toBeTruthy());
    expect(screen.getByText('general.error')).toBeTruthy();
    expect(screen.queryByText('settings.account_add.creation_error')).toBeNull();
  });

  it('keeps the generic message for any other failure', async () => {
    mockAddAccount.mockRejectedValueOnce(new Error('disk on fire'));

    await confirmPrivateKey();

    await waitFor(() =>
      expect(screen.getByText('settings.account_add.creation_error')).toBeTruthy()
    );
    expect(screen.getByText('general.error')).toBeTruthy();
  });
});
