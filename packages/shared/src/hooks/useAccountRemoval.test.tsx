/**
 * @vitest-environment jsdom
 */
/**
 * The removal gate, off the screen. What is asserted is the decision both
 * platforms inherit: a cached vault key removes without asking; a lapsed one
 * asks for the password up front; and a cache that lapses between the answer
 * and the write flips the answer instead of dead-ending on a generic error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useAccountRemoval } from './useAccountRemoval';
import { useAccountsContext } from '../contexts/AccountsContext';
import { isVaultKeyCached, EncryptionMaterialMissingError } from '../crypto/encrypt-mnemonics';

vi.mock('../contexts/AccountsContext', () => ({ useAccountsContext: vi.fn() }));
vi.mock('../crypto/encrypt-mnemonics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../crypto/encrypt-mnemonics')>()),
  isVaultKeyCached: vi.fn(),
}));

const accountsMock = vi.mocked(useAccountsContext);
const vaultCachedMock = vi.mocked(isVaultKeyCached);

const removeAccount = vi.fn();
const checkPassword = vi.fn();

const TARGET_ID = 'wallet-2';
const PASSWORD = 'correct horse battery staple';

beforeEach(() => {
  vi.clearAllMocks();
  accountsMock.mockReturnValue([
    { accounts: [{ id: 'wallet-1' }, { id: TARGET_ID }] },
    { removeAccount, checkPassword },
  ] as unknown as ReturnType<typeof useAccountsContext>);
  vaultCachedMock.mockResolvedValue(true);
  removeAccount.mockResolvedValue(undefined);
});

describe('useAccountRemoval', () => {
  it('removes without asking while the vault key is cached', async () => {
    const { result } = renderHook(() => useAccountRemoval());

    await waitFor(() => expect(vaultCachedMock).toHaveBeenCalled());
    expect(result.current.requiresPassword).toBe(false);

    await act(async () => {
      await result.current.remove(TARGET_ID);
    });

    expect(removeAccount).toHaveBeenCalledWith(TARGET_ID, undefined);
  });

  it('asks for the password once the cached key has lapsed', async () => {
    vaultCachedMock.mockResolvedValue(false);
    const { result } = renderHook(() => useAccountRemoval());

    await waitFor(() => expect(result.current.requiresPassword).toBe(true));
  });

  it('rethrows the recognisable error, and asks, when the key lapses before the write', async () => {
    removeAccount.mockRejectedValueOnce(new EncryptionMaterialMissingError());
    const { result } = renderHook(() => useAccountRemoval());

    await waitFor(() => expect(result.current.requiresPassword).toBe(false));

    await act(async () => {
      await expect(result.current.remove(TARGET_ID)).rejects.toBeInstanceOf(
        EncryptionMaterialMissingError
      );
    });

    expect(result.current.requiresPassword).toBe(true);
  });

  it('passes the collected password through to the removal', async () => {
    vaultCachedMock.mockResolvedValue(false);
    const { result } = renderHook(() => useAccountRemoval());

    await waitFor(() => expect(result.current.requiresPassword).toBe(true));

    await act(async () => {
      await result.current.remove(TARGET_ID, PASSWORD);
    });

    expect(removeAccount).toHaveBeenCalledWith(TARGET_ID, PASSWORD);
  });

  it('hands the vault own password check to the confirmation gate', async () => {
    checkPassword.mockResolvedValue(true);
    const { result } = renderHook(() => useAccountRemoval());

    await expect(result.current.validatePassword(PASSWORD)).resolves.toBe(true);
    expect(checkPassword).toHaveBeenCalledWith(PASSWORD);
  });
});
