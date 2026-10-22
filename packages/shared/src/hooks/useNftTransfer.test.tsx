/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const mockCreateTransferTransaction = vi.fn();
const mockSignAndSend = vi.fn();

// The Solana path no longer issues a plain SPL transfer: that fails on
// programmable NFTs with `Account is frozen`. It asks the backend for a
// Metaplex-built transaction and signs it locally.
vi.mock('../analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../analytics')>()),
  trackEvent: vi.fn(),
}));
vi.mock('../api/services/nft-transfer', () => ({
  createNftTransferTransaction: (...args: unknown[]) => mockCreateTransferTransaction(...args),
}));

vi.mock('../blockchain/solana/prepared-transactions', () => ({
  signAndSendPreparedSolanaTransactions: (...args: unknown[]) => mockSignAndSend(...args),
}));

import { useNftTransfer } from './useNftTransfer';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';
import { SolanaOutcomeUnknownError } from '../blockchain/solana/confirm';
import { trackEvent } from '../analytics';
import {
  PendingTransactionsProvider,
  usePendingTransactions,
} from '../contexts/PendingTransactionsContext';

function makeWrapper() {
  const client = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

const SOLANA_NFT = {
  blockchain: 'solana',
  mint: 'mint-1',
  name: 'Test NFT',
} as any;

const BITCOIN_NFT = {
  blockchain: 'bitcoin',
  mint: 'inscription-1',
  name: 'Ordinal',
} as any;

const PREPARED = { transaction: 'base64-tx' };

describe('useNftTransfer', () => {
  const account = {
    transfer: vi.fn(),
    getReceiveAddress: () => 'mock-address',
    getNetworkId: () => 'solana-mainnet',
    network: { networkId: 'solana-mainnet' },
    // The hook refuses any account that cannot sign, so the mock has to say it
    // holds key material the way a real SolanaAccount does.
    canSign: true as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTransferTransaction.mockResolvedValue(PREPARED);
    mockSignAndSend.mockResolvedValue(['nft-tx-1']);
  });

  it('transfers a Solana nft via a backend-built Metaplex transaction', async () => {
    const { result } = renderHook(
      () =>
        useNftTransfer({
          account: account as any,
        }),
      { wrapper: makeWrapper() }
    );

    let transferResult;
    await act(async () => {
      transferResult = await result.current.sendNft(SOLANA_NFT, 'recipient-address');
    });

    expect(mockCreateTransferTransaction).toHaveBeenCalledWith(
      {
        mintAddress: 'mint-1',
        ownerAddress: 'mock-address',
        destinationAddress: 'recipient-address',
      },
      'solana-mainnet'
    );
    // The mint and the destination travel with the call: the transaction the
    // backend built may move that NFT to that address and nothing else.
    expect(mockSignAndSend).toHaveBeenCalledWith(account, PREPARED, {
      nftAction: { asset: 'mint-1', destination: 'recipient-address' },
    });
    // A plain SPL transfer would fail on a programmable NFT, so it must not run.
    expect(account.transfer).not.toHaveBeenCalled();
    expect(transferResult).toEqual({ txId: 'nft-tx-1' });
    expect(result.current.status).toBe('success');
    expect(result.current.error).toBeNull();
  });

  it('throws immediately when no account is available', async () => {
    const { result } = renderHook(
      () =>
        useNftTransfer({
          account: undefined,
        }),
      { wrapper: makeWrapper() }
    );

    await expect(result.current.sendNft(SOLANA_NFT, 'recipient-address')).rejects.toThrow(
      'No account available'
    );
  });

  it('rejects unsupported ordinal transfers without building a transaction', async () => {
    const { result } = renderHook(
      () =>
        useNftTransfer({
          account: account as any,
        }),
      { wrapper: makeWrapper() }
    );

    await act(async () => {
      await expect(result.current.sendNft(BITCOIN_NFT, 'recipient-address')).rejects.toThrow(
        'Ordinal transfers are not yet supported'
      );
    });

    expect(mockCreateTransferTransaction).not.toHaveBeenCalled();
    expect(result.current.status).toBe('failed');
  });

  it('follows a send with an unknown outcome in the pending banner', async () => {
    mockSignAndSend.mockRejectedValue(new SolanaOutcomeUnknownError('sig-maybe' as never));
    const client = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryWrapper client={client}>
        <PendingTransactionsProvider getOutcomes={vi.fn(async () => ({}))} pollIntervalMs={10_000}>
          {children}
        </PendingTransactionsProvider>
      </QueryWrapper>
    );
    const { result } = renderHook(
      () => ({
        nft: useNftTransfer({ account: account as any }),
        pending: usePendingTransactions(),
      }),
      { wrapper }
    );

    await act(async () => {
      await result.current.nft.sendNft(SOLANA_NFT, 'recipient-address').catch(() => undefined);
    });

    expect(result.current.pending.pendingTransactions).toEqual([
      expect.objectContaining({ signature: 'sig-maybe', kind: 'send', summary: 'Test NFT' }),
    ]);
    expect(result.current.nft.error).toBe('transaction.errors.broadcastUnknown');
    // It may have landed, so it is not reported as a failed transfer.
    expect(trackEvent).not.toHaveBeenCalledWith('nft_sent', expect.anything());
  });

  it('surfaces transfer failures and allows reset', async () => {
    mockSignAndSend.mockRejectedValueOnce(new Error('simulation failed'));

    const { result } = renderHook(
      () =>
        useNftTransfer({
          account: account as any,
        }),
      { wrapper: makeWrapper() }
    );

    await act(async () => {
      await expect(result.current.sendNft(SOLANA_NFT, 'recipient-address')).rejects.toThrow(
        'simulation failed'
      );
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe('transaction.errors.generic');
    expect(result.current.isError).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
  });
});
