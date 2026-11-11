/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { AccountsContext, type AccountsContextValue } from '../contexts/AccountsContext';
import { PhraseBackupProvider, usePhraseBackup } from '../contexts/PhraseBackupContext';
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
import { usePhraseBackupSheet } from './usePhraseBackupSheet';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

// The first twelve words of the BIP39 list: a test phrase, never a wallet's.
const PHRASE = wordlist.slice(0, 12).join(' ');

function setup(params: Parameters<typeof usePhraseBackupSheet>[0] = {}) {
  const account = {
    id: 'new',
    secret: { kind: 'mnemonic', mnemonic: PHRASE },
  } as unknown as Account;
  const checkPassword = vi.fn(async (p: string) => p === 'right');
  const accounts = [
    { activeAccount: account },
    { checkPassword },
  ] as unknown as AccountsContextValue;
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AccountsContext.Provider value={accounts}>
      <PhraseBackupProvider>{children}</PhraseBackupProvider>
    </AccountsContext.Provider>
  );
  return renderHook(() => ({ sheet: usePhraseBackupSheet(params), backup: usePhraseBackup() }), {
    wrapper: Wrapper,
  });
}

type Hook = ReturnType<typeof setup>['result'];

async function openForSend(result: Hook) {
  await waitFor(() => expect(result.current.backup.needsBackup).toBe(true));
  let signed: Promise<boolean> = Promise.resolve(false);
  act(() => {
    signed = result.current.backup.requireBackup();
  });
  await waitFor(() => expect(result.current.sheet.visible).toBe(true));
  return () => signed;
}

async function enterPassword(result: Hook, value: string) {
  act(() => result.current.sheet.password.setPassword(value));
  await act(() => result.current.sheet.password.confirm());
}

describe('usePhraseBackupSheet', () => {
  beforeEach(async () => {
    if (!isStorageInitialized()) {
      initStorage({ platform: 'extension', adapter: createLocalStorageAdapter() });
    }
    await setStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES, ['new']);
  });

  afterEach(() => {
    localStorage.clear();
    resetStorage();
  });

  it('shows no word before the password, and confirms after three right answers', async () => {
    const { result } = setup();
    const signed = await openForSend(result);
    expect(result.current.sheet.step).toBe('intro');
    expect(result.current.sheet.words).toEqual([]);

    await act(() => result.current.sheet.start());
    expect(result.current.sheet.step).toBe('password');
    await enterPassword(result, 'wrong');
    expect(result.current.sheet.step).toBe('password');
    expect(result.current.sheet.words).toEqual([]);

    await enterPassword(result, 'right');
    expect(result.current.sheet.step).toBe('phrase');
    expect(result.current.sheet.words).toEqual(PHRASE.split(' '));

    act(() => result.current.sheet.phraseSeen());
    for (let i = 0; i < 3; i++) {
      const question = result.current.sheet.question!;
      await act(() => result.current.sheet.choose(question.answer));
    }

    await expect(signed()).resolves.toBe(true);
    expect(result.current.sheet.visible).toBe(false);
    expect(await getStorageItem(STORAGE_KEYS.UNCONFIRMED_PHRASES)).toEqual([]);
  });

  it('shows the phrase again after a wrong answer and starts the questions over', async () => {
    const { result } = setup({ biometricAvailable: true, verifyBiometric: async () => true });
    await openForSend(result);
    await act(() => result.current.sheet.start());
    expect(result.current.sheet.step).toBe('phrase');

    act(() => result.current.sheet.phraseSeen());
    const first = result.current.sheet.question!;
    await act(() => result.current.sheet.choose(first.answer));
    const second = result.current.sheet.question!;
    await act(() => result.current.sheet.choose(second.options.find((o) => o !== second.answer)!));

    expect(result.current.sheet.step).toBe('phrase');
    expect(result.current.sheet.missed).toBe(true);
    act(() => result.current.sheet.phraseSeen());
    expect(result.current.sheet.questionIndex).toBe(0);
    expect(result.current.backup.needsBackup).toBe(true);
  });

  it('falls back to the password when biometrics fail', async () => {
    const { result } = setup({ biometricAvailable: true, verifyBiometric: async () => false });
    await openForSend(result);
    await act(() => result.current.sheet.start());
    expect(result.current.sheet.step).toBe('password');
  });

  it('does not sign when closed midway', async () => {
    const { result } = setup();
    const signed = await openForSend(result);
    act(() => result.current.sheet.close());
    await expect(signed()).resolves.toBe(false);
  });
});
