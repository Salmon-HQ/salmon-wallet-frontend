/**
 * @vitest-environment jsdom
 *
 * What this file pins down is the felt behaviour of a chain switch: the first
 * one may show a skeleton, every later one must not. The mechanism is the
 * cache, so the assertions are about `loading` — the flag every home screen
 * turns into a skeleton — and not about how many renders react-query needs.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../utils/account', () => ({
  isSolanaAccount: vi.fn(),
  isBitcoinAccount: vi.fn(),
  isEthereumAccount: vi.fn(),
}));

vi.mock('../storage', () => ({
  getStorageItem: vi.fn().mockResolvedValue(null),
  setStorageItem: vi.fn().mockResolvedValue(undefined),
  STORAGE_KEYS: { HIDDEN_BALANCE: 'hidden_balance' },
}));

import { useBalance } from './useBalance';
import { usePrefetchBalances } from './usePrefetchBalances';
import { isSolanaAccount, isBitcoinAccount, isEthereumAccount } from '../utils/account';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';
import { queryKeys } from '../query/keys';
import type { Account } from '../types/account';
import type { BlockchainAccount, NetworkId } from '../types/blockchain';

const mockIsSolanaAccount = vi.mocked(isSolanaAccount);
const mockIsBitcoinAccount = vi.mocked(isBitcoinAccount);
const mockIsEthereumAccount = vi.mocked(isEthereumAccount);

function makeBlockchainAccount(address: string, usdTotal: number) {
  return {
    getReceiveAddress: vi.fn().mockReturnValue(address),
    getBalance: vi.fn().mockResolvedValue({ usdTotal, last24HoursChange: 0, items: [] }),
  } as unknown as BlockchainAccount;
}

const SOLANA: NetworkId = 'solana-mainnet';
const BITCOIN: NetworkId = 'bitcoin-mainnet';

function makeAccount() {
  const solana = makeBlockchainAccount('sol-address', 100);
  const bitcoin = makeBlockchainAccount('btc-address', 42);
  const account = {
    id: 'account-1',
    networksAccounts: {
      [SOLANA]: [solana],
      [BITCOIN]: [bitcoin],
    },
  } as unknown as Account;
  return { account, solana, bitcoin };
}

function makeWrapper() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  return { client, wrapper };
}

describe('usePrefetchBalances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Every account in these tests behaves like a Solana one for fetching
    // purposes; the chain the balance came from is carried by the query key,
    // which is what the caching behaviour under test depends on.
    mockIsSolanaAccount.mockReturnValue(true);
    mockIsBitcoinAccount.mockReturnValue(false);
    mockIsEthereumAccount.mockReturnValue(false);
  });

  it('fetches the inactive chain and leaves the active one to useBalance', async () => {
    const { account, solana, bitcoin } = makeAccount();
    const { wrapper } = makeWrapper();

    renderHook(
      () =>
        usePrefetchBalances({
          account,
          networkIds: [SOLANA, BITCOIN],
          activeNetworkId: SOLANA,
        }),
      { wrapper }
    );

    await waitFor(() => expect(bitcoin.getBalance).toHaveBeenCalledTimes(1));
    expect(solana.getBalance).not.toHaveBeenCalled();
  });

  it('does not re-fetch a chain that is already cached', async () => {
    const { account, bitcoin } = makeAccount();
    const { wrapper } = makeWrapper();

    const { rerender } = renderHook(
      () =>
        usePrefetchBalances({
          account,
          networkIds: [SOLANA, BITCOIN],
          activeNetworkId: SOLANA,
        }),
      { wrapper }
    );

    await waitFor(() => expect(bitcoin.getBalance).toHaveBeenCalledTimes(1));
    rerender();
    rerender();

    expect(bitcoin.getBalance).toHaveBeenCalledTimes(1);
  });

  it('switching to a prefetched chain shows a balance without a loading state', async () => {
    const { account, bitcoin } = makeAccount();
    const { client, wrapper } = makeWrapper();

    renderHook(
      () =>
        usePrefetchBalances({
          account,
          networkIds: [SOLANA, BITCOIN],
          activeNetworkId: SOLANA,
        }),
      { wrapper }
    );
    await waitFor(() => expect(bitcoin.getBalance).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        client.getQueryData(
          queryKeys.balance({ accountId: 'btc-address', networkId: BITCOIN, includeSpam: false })
        )
      ).toBeDefined()
    );

    // The switch: the Bitcoin balance hook mounts for the first time.
    const { result } = renderHook(
      () =>
        useBalance({
          account: account.networksAccounts[BITCOIN][0] ?? undefined,
          networkId: BITCOIN,
        }),
      { wrapper }
    );

    // No skeleton on the very first render — the cache already had the number.
    expect(result.current.loading).toBe(false);
    expect(result.current.hasData).toBe(true);
    expect(result.current.usdTotal).toBe(42);
  });

  it('a chain never visited and never prefetched does start in a loading state', async () => {
    const { account } = makeAccount();
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useBalance({
          account: account.networksAccounts[BITCOIN][0] ?? undefined,
          networkId: BITCOIN,
        }),
      { wrapper }
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.hasData).toBe(false);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
