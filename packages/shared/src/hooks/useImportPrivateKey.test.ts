/**
 * @vitest-environment jsdom
 *
 * The parser itself is covered against real ed25519 in
 * `crypto/private-key.test.ts` (node environment — jsdom's WebCrypto cannot
 * do ed25519). Here it is stubbed so these tests exercise what the hook owns:
 * state transitions, duplicate rejection, and never leaking the key.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useImportPrivateKey } from './useImportPrivateKey';
import { parseSolanaPrivateKey } from '../crypto/private-key';
import type { Account } from '../types/account';
import type { BlockchainAccount } from '../types/blockchain';

vi.mock('../crypto/private-key', () => ({ parseSolanaPrivateKey: vi.fn() }));

const parseMock = vi.mocked(parseSolanaPrivateKey);

const VALID_KEY = 'valid-base58-key';
const ADDRESS = '7Q3Hm2QkDLJyy727sNc2AeH2vZxiPgWWXX6vTq8Ras6n';

function accountHolding(address: string): Account {
  return {
    id: 'existing',
    name: 'Existing',
    avatar: 'default',
    secret: { kind: 'mnemonic', mnemonic: 'seed words' },
    pathIndexes: { 'solana-mainnet': [0] },
    networksAccounts: {
      'solana-mainnet': [{ getReceiveAddress: () => address } as unknown as BlockchainAccount],
    },
  };
}

beforeEach(() => {
  parseMock.mockReset();
  parseMock.mockResolvedValue({
    ok: true,
    secretKey: new Uint8Array(64),
    privateKey: VALID_KEY,
    address: ADDRESS,
  });
});

describe('useImportPrivateKey', () => {
  it('resolves the address a valid key controls', async () => {
    const { result } = renderHook(() => useImportPrivateKey({ accounts: [] }));

    act(() => result.current.setValue(VALID_KEY));
    await act(async () => {
      expect(await result.current.validate()).toBe(true);
    });

    expect(result.current.address).toBe(ADDRESS);
    expect(result.current.privateKey).toBe(VALID_KEY);
    expect(result.current.error).toBeNull();
  });

  it('surfaces the parser i18n key, never the pasted value', async () => {
    parseMock.mockResolvedValue({ ok: false, reason: 'wallet.import.errors.format' });
    const { result } = renderHook(() => useImportPrivateKey({ accounts: [] }));

    act(() => result.current.setValue('nonsense!!'));
    await act(async () => {
      expect(await result.current.validate()).toBe(false);
    });

    expect(result.current.error).toBe('wallet.import.errors.format');
    expect(result.current.address).toBeNull();
  });

  it('refuses a key for an address the wallet already holds', async () => {
    const { result } = renderHook(() =>
      useImportPrivateKey({ accounts: [accountHolding(ADDRESS)] })
    );

    act(() => result.current.setValue(VALID_KEY));
    await act(async () => {
      expect(await result.current.validate()).toBe(false);
    });

    // Two entries for one address would show the balance twice and make
    // "which one am I sending from" unanswerable.
    expect(result.current.error).toBe('wallet.import.errors.duplicate');
    expect(result.current.privateKey).toBeNull();
  });

  it('drops the resolved address as soon as the field is edited', async () => {
    const { result } = renderHook(() => useImportPrivateKey({ accounts: [] }));

    act(() => result.current.setValue(VALID_KEY));
    await act(async () => {
      await result.current.validate();
    });
    expect(result.current.address).toBe(ADDRESS);

    // Otherwise the user could confirm an import while looking at the address
    // of a key they already replaced.
    act(() => result.current.setValue(`${VALID_KEY}x`));

    expect(result.current.address).toBeNull();
    expect(result.current.privateKey).toBeNull();
  });

  it('clears the key from state on reset', async () => {
    const { result } = renderHook(() => useImportPrivateKey({ accounts: [] }));

    act(() => result.current.setValue(VALID_KEY));
    await act(async () => {
      await result.current.validate();
    });

    act(() => result.current.reset());

    expect(result.current.value).toBe('');
    expect(result.current.privateKey).toBeNull();
    expect(result.current.hasInput).toBe(false);
  });
});
