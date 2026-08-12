/**
 * @vitest-environment jsdom
 * Tests for useSendTransaction hook
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { useSendTransaction } from './useSendTransaction';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';
import { queryKeys } from '../query/keys';

function makeWrapper() {
  const client = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

function makeWrapperWithClient() {
  const client = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  Wrapper.displayName = 'TestWrapperWithClient';
  return { client, wrapper: Wrapper };
}

// ============================================================================
// Test Data
// ============================================================================

const RAW_RECIPIENT = 'nachomileo.sol';
const RESOLVED_RECIPIENT = '9xQeWvG816bUx9EPjHmaT23yvVMc2KLS8i4Qb9pQ6M7';
const TOKEN_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const AMOUNT = 0.5;
const FEE_RESULT = { fee: '0.000005' };
const TX_RESULT = { txId: 'test-signature' };

const mockAccount = {
  estimateTransferFee: vi.fn(),
  transfer: vi.fn(),
  getReceiveAddress: () => 'mock-address',
  getNetworkId: () => 'solana-mainnet',
  network: { networkId: 'solana-mainnet' },
};

// ============================================================================
// Tests
// ============================================================================

describe('useSendTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccount.estimateTransferFee.mockResolvedValue(FEE_RESULT);
    mockAccount.transfer.mockResolvedValue(TX_RESULT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the resolved recipient address for fee estimation when provided', async () => {
    const { result } = renderHook(
      () =>
        useSendTransaction({
          account: mockAccount as any,
          blockchain: 'solana',
        }),
      { wrapper: makeWrapper() }
    );

    let feeResult = null;

    await act(async () => {
      feeResult = await result.current.estimateFee({
        token: {
          address: TOKEN_ADDRESS,
          decimals: 6,
          symbol: 'USDC',
        },
        recipientAddress: RAW_RECIPIENT,
        resolvedRecipientAddress: RESOLVED_RECIPIENT,
        amount: AMOUNT,
      });
    });

    expect(feeResult).toEqual(FEE_RESULT);
    expect(mockAccount.estimateTransferFee).toHaveBeenCalledWith(
      RESOLVED_RECIPIENT,
      TOKEN_ADDRESS,
      AMOUNT
    );
  });

  it('uses the resolved recipient address for transfer execution when provided', async () => {
    const { result } = renderHook(
      () =>
        useSendTransaction({
          account: mockAccount as any,
          blockchain: 'solana',
        }),
      { wrapper: makeWrapper() }
    );

    let txResult = null;

    await act(async () => {
      txResult = await result.current.sendTransaction({
        token: {
          address: TOKEN_ADDRESS,
          decimals: 6,
          symbol: 'USDC',
        },
        recipientAddress: RAW_RECIPIENT,
        resolvedRecipientAddress: RESOLVED_RECIPIENT,
        amount: AMOUNT,
      });
    });

    expect(txResult).toEqual(TX_RESULT);
    expect(mockAccount.transfer).toHaveBeenCalledWith(RESOLVED_RECIPIENT, TOKEN_ADDRESS, AMOUNT, {
      decimals: 6,
      symbol: 'USDC',
    });
    expect(result.current.status).toBe('success');
    expect(result.current.error).toBeNull();
  });

  it('settles after a send by polling until the indexer reflects the new balance', async () => {
    // Event-driven settlement (useSettleUntilChanged): `settling` stays true and
    // the balance is refetched until its on-chain signature actually changes.
    const amounts = { current: '1000000000' };
    const fetchBalance = vi.fn(async () => ({
      items: [{ address: 'So11111111111111111111111111111111111111112', amount: amounts.current }],
    }));
    const balanceKey = queryKeys.balance({
      accountId: 'mock-address',
      networkId: 'solana-mainnet' as never,
    });
    const { client, wrapper } = makeWrapperWithClient();

    const { result } = renderHook(
      () => {
        const balanceQuery = useQuery({
          queryKey: balanceKey,
          queryFn: fetchBalance,
          staleTime: 15_000,
        });
        const send = useSendTransaction({
          account: mockAccount as any,
          blockchain: 'solana',
        });
        return { balanceQuery, send };
      },
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.balanceQuery.data?.items?.[0]?.amount).toBe('1000000000');
    });

    vi.useFakeTimers();

    await act(async () => {
      await result.current.send.sendTransaction({
        token: {
          address: TOKEN_ADDRESS,
          decimals: 6,
          symbol: 'USDC',
        },
        recipientAddress: RAW_RECIPIENT,
        resolvedRecipientAddress: RESOLVED_RECIPIENT,
        amount: AMOUNT,
      });
    });

    // Returned immediately with success; settlement still pending.
    expect(result.current.send.status).toBe('success');
    expect(result.current.send.settling).toBe(true);

    // Still stale after the first poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });
    expect(result.current.send.settling).toBe(true);

    // Indexer catches up; the next poll observes the change and releases.
    amounts.current = '989995000';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(result.current.send.settling).toBe(false);
    });
    expect(
      (client.getQueryData(balanceKey) as { items: Array<{ amount: string }> }).items[0].amount
    ).toBe('989995000');
  });

  it('flags feeEstimateFailed when estimation throws and clears it on the next success', async () => {
    mockAccount.estimateTransferFee.mockRejectedValueOnce(new Error('rpc down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(
      () =>
        useSendTransaction({
          account: mockAccount as any,
          blockchain: 'solana',
        }),
      { wrapper: makeWrapper() }
    );

    expect(result.current.feeEstimateFailed).toBe(false);

    const params = {
      token: { address: TOKEN_ADDRESS, decimals: 6, symbol: 'USDC' },
      recipientAddress: RAW_RECIPIENT,
      amount: AMOUNT,
    };

    let feeResult = null;
    await act(async () => {
      feeResult = await result.current.estimateFee(params);
    });

    // Non-blocking: still returns null, status back to idle — but the failure
    // is surfaced.
    expect(feeResult).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(result.current.feeEstimateFailed).toBe(true);

    // Retry succeeds -> flag clears.
    await act(async () => {
      feeResult = await result.current.estimateFee(params);
    });
    expect(feeResult).toEqual(FEE_RESULT);
    expect(result.current.feeEstimateFailed).toBe(false);
  });

  it('clears feeEstimateFailed on reset', async () => {
    mockAccount.estimateTransferFee.mockRejectedValueOnce(new Error('rpc down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(
      () =>
        useSendTransaction({
          account: mockAccount as any,
          blockchain: 'solana',
        }),
      { wrapper: makeWrapper() }
    );

    await act(async () => {
      await result.current.estimateFee({
        token: { address: TOKEN_ADDRESS, decimals: 6, symbol: 'USDC' },
        recipientAddress: RAW_RECIPIENT,
        amount: AMOUNT,
      });
    });
    expect(result.current.feeEstimateFailed).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.feeEstimateFailed).toBe(false);
  });

  it('returns null for fee estimation when account is missing', async () => {
    const { result } = renderHook(
      () =>
        useSendTransaction({
          account: undefined,
          blockchain: 'solana',
        }),
      { wrapper: makeWrapper() }
    );

    let feeResult = null;

    await act(async () => {
      feeResult = await result.current.estimateFee({
        token: {
          address: TOKEN_ADDRESS,
          decimals: 6,
          symbol: 'USDC',
        },
        recipientAddress: RAW_RECIPIENT,
        amount: AMOUNT,
      });
    });

    expect(feeResult).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('throws when sending without an account', async () => {
    const { result } = renderHook(
      () =>
        useSendTransaction({
          account: undefined,
          blockchain: 'solana',
        }),
      { wrapper: makeWrapper() }
    );

    await expect(
      result.current.sendTransaction({
        token: {
          address: TOKEN_ADDRESS,
          decimals: 6,
          symbol: 'USDC',
        },
        recipientAddress: RAW_RECIPIENT,
        amount: AMOUNT,
      })
    ).rejects.toThrow('No account available');
  });

  it('sets failed state and preserves error message when transfer fails', async () => {
    mockAccount.transfer.mockRejectedValueOnce(new Error('insufficient funds'));

    const { result } = renderHook(
      () =>
        useSendTransaction({
          account: mockAccount as any,
          blockchain: 'solana',
        }),
      { wrapper: makeWrapper() }
    );

    await act(async () => {
      await expect(
        result.current.sendTransaction({
          token: {
            address: TOKEN_ADDRESS,
            decimals: 6,
            symbol: 'USDC',
          },
          recipientAddress: RAW_RECIPIENT,
          amount: AMOUNT,
        })
      ).rejects.toThrow('insufficient funds');
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe('transaction.errors.insufficientFunds');
    expect(result.current.isError).toBe(true);
  });

  it('resets state after an error', async () => {
    mockAccount.transfer.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(
      () =>
        useSendTransaction({
          account: mockAccount as any,
          blockchain: 'solana',
        }),
      { wrapper: makeWrapper() }
    );

    await act(async () => {
      await expect(
        result.current.sendTransaction({
          token: {
            address: TOKEN_ADDRESS,
            decimals: 6,
            symbol: 'USDC',
          },
          recipientAddress: RAW_RECIPIENT,
          amount: AMOUNT,
        })
      ).rejects.toThrow('boom');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
  });
});
