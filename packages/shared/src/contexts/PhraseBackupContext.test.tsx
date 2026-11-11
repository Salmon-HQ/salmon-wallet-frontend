/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AccountsContext, type AccountsContextValue } from './AccountsContext';
import { PhraseBackupProvider, usePhraseBackup } from './PhraseBackupContext';
import {
  createLocalStorageAdapter,
  getStorageItem,
  initStorage,
  isStorageInitialized,
  resetStorage,
  setStorageItem,
  STORAGE_KEYS,
} from '../storage';
import type { Account } from '../types/account';

// The public test vector: never a real wallet's phrase.
const PHRASE =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const wallet = (id: string, extra: Partial<Account> = {}) =>
  ({ id, secret: { kind: 'mnemonic', mnemonic: PHRASE }, ...extra }) as unknown as Account;

function setup(active: Account | undefined) {
  const accounts = [{ activeAccount: active }, {}] as unknown as AccountsContextValue;
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AccountsContext.Provider value={accounts}>
      <PhraseBackupProvider>{children}</PhraseBackupProvider>
    </AccountsContext.Provider>
  );
  return renderHook(() => usePhraseBackup(), { wrapper: Wrapper });
}

describe('PhraseBackupProvider', () => {
  beforeEach(() => {
    if (!isStorageInitialized()) {
      initStorage({ platform: 'extension', adapter: createLocalStorageAdapter() });
    }
  });

  afterEach(() => {
    localStorage.clear();
    resetStorage();
  });

  it('asks nothing of a wallet that was never marked', async () => {
    const { result } = setup(wallet('imported'));

    await expect(result.current.requireBackup()).resolves.toBe(true);
    expect(result.current.needsBackup).toBe(false);
  });

  it('holds a transaction until the phrase is confirmed, then never asks again', async () => {
    await setStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES, ['new']);
    const { result } = setup(wallet('new'));
    await waitFor(() => expect(result.current.needsBackup).toBe(true));

    let signed: Promise<boolean> = Promise.resolve(false);
    act(() => {
      signed = result.current.requireBackup();
    });
    await waitFor(() => expect(result.current.sheet).toEqual({ reason: 'send' }));

    await act(() => result.current.confirmBackup());

    await expect(signed).resolves.toBe(true);
    expect(result.current.sheet).toBeNull();
    expect(result.current.needsBackup).toBe(false);
    expect(await getStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES)).toEqual([]);
  });

  it('does not sign when the sheet is left without confirming', async () => {
    await setStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES, ['new']);
    const { result } = setup(wallet('new'));
    await waitFor(() => expect(result.current.needsBackup).toBe(true));

    let signed: Promise<boolean> = Promise.resolve(true);
    act(() => {
      signed = result.current.requireBackup();
    });
    await waitFor(() => expect(result.current.sheet).not.toBeNull());
    act(() => result.current.cancelBackup());

    await expect(signed).resolves.toBe(false);
    expect(result.current.needsBackup).toBe(true);
  });

  it('asks for a wallet derived from an unconfirmed one, which shares its phrase', async () => {
    await setStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES, ['parent']);
    const { result } = setup(wallet('child', { derivedFrom: 'parent' }));

    await waitFor(() => expect(result.current.needsBackup).toBe(true));
  });

  it('marks a new wallet without dropping one already waiting', async () => {
    await setStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES, ['first']);
    const { result } = setup(undefined);

    await act(() => result.current.markUnconfirmed('second'));

    expect(await getStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES)).toEqual(['first', 'second']);
  });

  it('asks nothing outside a provider', async () => {
    const { result } = renderHook(() => usePhraseBackup());
    await expect(result.current.requireBackup()).resolves.toBe(true);
  });
});
