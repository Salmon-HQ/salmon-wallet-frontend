/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AccountsContext,
  AccountsProvider,
  useAccountsContext,
  type AccountsContextValue,
} from './AccountsContext';
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
import { startCrashStorage } from '../test-utils/crash-storage';
import type { Account } from '../types/account';
import type { BlockchainAccount } from '../types/blockchain';

/** The next write of `key` waits here until the test releases it. */
const gate = vi.hoisted(() => ({
  key: null as string | null,
  reached: null as ((release: () => void) => void) | null,
}));

vi.mock('../storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../storage')>();
  return {
    ...actual,
    setStorageItem: (async (key, value) => {
      if (key === gate.key) {
        gate.key = null;
        await new Promise<void>((release) => gate.reached?.(release));
      }
      return actual.setStorageItem(key, value);
    }) as typeof actual.setStorageItem,
  };
});

vi.mock('../crypto/encryption', async (importOriginal) =>
  (await import('../test-utils/crash-storage')).keySensitiveCipher(
    await importOriginal<typeof import('../crypto/encryption')>()
  )
);

// The connection record follows the active wallet; it is not what is tested here.
vi.mock('../hooks/useAccountsConnection', () => ({ useAccountsConnection: () => undefined }));

// Loading a wallet derives no address here: the catalog lives on the network.
vi.mock('../utils/account', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/account')>()),
  createBlockchainAccountForNetwork: vi.fn(async () => null),
}));

/** Resolves once the next write of `key` is held, with the function that lets it land. */
const holdNextWrite = (key: string) =>
  new Promise<() => void>((reached) => {
    gate.key = key;
    gate.reached = reached;
  });

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

  it('asks nothing outside a provider', async () => {
    const { result } = renderHook(() => usePhraseBackup());
    await expect(result.current.requireBackup()).resolves.toBe(true);
  });
});

describe('PhraseBackupProvider over the stored wallets', () => {
  const NETWORK = 'solana-mainnet';
  const held = { network: { id: NETWORK } } as unknown as BlockchainAccount;
  const saved = (id: string, mnemonic: string): Account => ({
    id,
    name: id,
    avatar: 'default',
    secret: { kind: 'mnemonic', mnemonic },
    pathIndexes: { [NETWORK]: [0] },
    networksAccounts: { [NETWORK]: [held] },
  });
  const NEW = saved('new', PHRASE);
  const OTHER = saved('other', 'phrase of another wallet');

  function live() {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccountsProvider>
        <PhraseBackupProvider>{children}</PhraseBackupProvider>
      </AccountsProvider>
    );
    return renderHook(() => ({ backup: usePhraseBackup(), accounts: useAccountsContext() }), {
      wrapper: Wrapper,
    });
  }

  beforeEach(async () => {
    await startCrashStorage();
  });

  afterEach(() => {
    gate.key = null;
    resetStorage();
  });

  it('shows the backup as due right after a save marks the wallet, without remounting', async () => {
    const { result } = live();
    await waitFor(() => expect(result.current.accounts[0].ready).toBe(true));

    await act(() => result.current.accounts[1].addAccount(NEW, 'P1', { unconfirmed: true }));

    await waitFor(() => expect(result.current.backup.needsBackup).toBe(true));
  });

  it('confirms against what a save in flight leaves, so neither undoes the other', async () => {
    const { result } = live();
    await waitFor(() => expect(result.current.accounts[0].ready).toBe(true));
    await act(() => result.current.accounts[1].addAccount(NEW, 'P1', { unconfirmed: true }));
    await setStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES, ['new', 'stale']);
    // Taken while `new` is the active wallet: the save below makes `other` active.
    const { confirmBackup } = result.current.backup;

    const paused = holdNextWrite(STORAGE_KEYS.UNCONFIRMED_PHRASES);
    let saving: Promise<void> = Promise.resolve();
    act(() => {
      saving = result.current.accounts[1].addAccount(OTHER);
    });
    const release = await paused;
    let confirming: Promise<void> = Promise.resolve();
    act(() => {
      confirming = confirmBackup();
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    release();
    await act(async () => {
      await saving;
      await confirming;
    });

    expect(await getStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES)).toEqual([]);
  });
});
