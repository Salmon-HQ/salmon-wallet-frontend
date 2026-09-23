/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockSettleAfterTx = vi.fn().mockResolvedValue(undefined);
vi.mock('../query/invalidation', () => ({ useSettleAfterTx: () => mockSettleAfterTx }));
vi.mock('../utils/account', () => ({ isSolanaAccount: () => true }));

import { useAccountActivity } from './useAccountActivity';

const WALLET = '7Q3Hm2QkDLJyy727sNc2AeH2vZxiPgWWXX6vTq8Ras6n';

/** An account whose log subscription yields what the test pushes. */
function accountWithLogs() {
  const pushed: Array<(value: IteratorResult<unknown>) => void> = [];
  const queue: unknown[] = [];
  const iterable = {
    [Symbol.asyncIterator]: () => ({
      next: () =>
        new Promise<IteratorResult<unknown>>((resolve) => {
          const value = queue.shift();
          if (value !== undefined) resolve({ value, done: false });
          else pushed.push(resolve);
        }),
    }),
  };
  const logsNotifications = vi.fn(() => ({ subscribe: vi.fn().mockResolvedValue(iterable) }));
  const account = {
    getReceiveAddress: () => WALLET,
    getNetworkId: () => 'solana-devnet',
    getRpcSubscriptions: () => ({ logsNotifications }),
  };
  const emit = (value: unknown) => {
    const resolve = pushed.shift();
    if (resolve) resolve({ value, done: false });
    else queue.push(value);
  };
  return { account, emit, logsNotifications };
}

describe('useAccountActivity', () => {
  afterEach(() => vi.clearAllMocks());

  // A receive changes nothing on screen unless something asks again: the
  // chain's own report of a transaction mentioning the wallet is the cue.
  it('refreshes the account once per burst of activity on it', async () => {
    const { account, emit, logsNotifications } = accountWithLogs();
    renderHook(() => useAccountActivity(account as never, 'wallet-1'));

    await waitFor(() => expect(logsNotifications).toHaveBeenCalled());
    expect(logsNotifications.mock.calls[0]).toEqual([
      { mentions: [WALLET] },
      { commitment: 'confirmed' },
    ]);

    emit({ value: { signature: 'a' } });
    emit({ value: { signature: 'a' } });

    await waitFor(() => expect(mockSettleAfterTx).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(mockSettleAfterTx).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: WALLET,
        avatarAccountId: 'wallet-1',
        networkId: 'solana-devnet',
        kinds: ['balance', 'transactions', 'nfts', 'avatar-nfts'],
      })
    );
  });

  it('listens to nothing without a Solana account', () => {
    renderHook(() => useAccountActivity(null));
    expect(mockSettleAfterTx).not.toHaveBeenCalled();
  });
});
