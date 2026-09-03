/**
 * @vitest-environment jsdom
 *
 * The NFT flow's state, tested once for both platforms. The transaction hooks
 * and the burn builder are faked at their own modules — what is under test is
 * the state machine: which arguments reach them, what the receipt holds, and
 * that an edited recipient can never be signed for under a stale verdict.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSendNft = vi.fn();
const mockBurnNft = vi.fn();
const mockCreateBurnTransaction = vi.fn();
const mockSettleAfterTx = vi.fn();
const mockGetCredit = vi.fn();

vi.mock('./useNftTransfer', () => ({
  useNftTransfer: () => ({ sendNft: mockSendNft, settling: false }),
}));
vi.mock('./useNftBurn', () => ({
  useNftBurn: () => ({ burnNft: mockBurnNft, settling: false }),
}));
vi.mock('../api/services/nft-burn', () => ({
  createBurnTransaction: (...args: unknown[]) => mockCreateBurnTransaction(...args),
}));
vi.mock('../query/invalidation', () => ({
  useSettleAfterTx: () => mockSettleAfterTx,
}));
vi.mock('../config/explorers', () => ({
  getDefaultExplorer: () => 'solscan',
  getTransactionUrl: () => 'https://explorer.example/tx',
}));

import { useNftFlowState } from './useNftFlowState';
import type { NftData } from '../utils/nft';
import type { BlockchainAccount } from '../types/blockchain';

const nft = {
  mint: 'Mint111',
  name: 'Burnable NFT',
  blockchain: 'solana',
} as unknown as NftData;

const account = {
  getReceiveAddress: () => 'Owner111',
  getNetworkId: () => 'solana-mainnet',
  getCredit: (...args: unknown[]) => mockGetCredit(...args),
} as unknown as BlockchainAccount;

const params = { nft, account, networkId: 'solana-mainnet' as const, activeAccountId: 'acct-1' };

describe('useNftFlowState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateBurnTransaction.mockResolvedValue({ transaction: 'burn-transaction' });
    mockBurnNft.mockResolvedValue(['signature-111']);
    mockSendNft.mockResolvedValue({ txId: 'tx123' });
    mockSettleAfterTx.mockResolvedValue(undefined);
    mockGetCredit.mockResolvedValue(0);
  });

  it('builds the burn preview from the same contract with the same arguments', async () => {
    const { result } = renderHook(() => useNftFlowState(params));

    await act(() => result.current.prepareBurn());

    expect(mockCreateBurnTransaction).toHaveBeenCalledWith(
      { mintAddress: 'Mint111', ownerAddress: 'Owner111' },
      'solana-mainnet'
    );
    expect(result.current.burnPreview).toEqual({ transaction: 'burn-transaction' });
    expect(result.current.burnError).toBeNull();
  });

  it('flags a preview whose lookup-table rent the wallet cannot pay', async () => {
    mockCreateBurnTransaction.mockResolvedValue({
      transaction: 'burn-transaction',
      lookupTable: { estimatedRentLamports: 5000 },
    });
    mockGetCredit.mockResolvedValue(100);
    const { result } = renderHook(() => useNftFlowState(params));

    await act(() => result.current.prepareBurn());

    expect(result.current.burnError).toBe('nft.burn.insufficientFeeSol');
  });

  it('hands an unsupported chain back to the caller instead of building anything', async () => {
    const onBurnUnsupported = vi.fn();
    const { result } = renderHook(() =>
      useNftFlowState({
        ...params,
        nft: { ...nft, blockchain: 'bitcoin' } as unknown as NftData,
        onBurnUnsupported,
      })
    );

    await act(() => result.current.prepareBurn());

    expect(onBurnUnsupported).toHaveBeenCalledWith('bitcoin');
    expect(mockCreateBurnTransaction).not.toHaveBeenCalled();
  });

  it('confirms the burn with the preview and lands on the receipt', async () => {
    const { result } = renderHook(() => useNftFlowState(params));
    await act(() => result.current.prepareBurn());

    await act(() => result.current.confirmBurn());

    expect(mockBurnNft).toHaveBeenCalledWith({ transaction: 'burn-transaction' }, 'Mint111');
    expect(result.current.successKind).toBe('burn');
    expect(result.current.successTxId).toBe('signature-111');
    expect(result.current.explorerUrl).toBe('https://explorer.example/tx');
  });

  it('sends to the resolved address of a domain, and never under a stale verdict', async () => {
    const { result } = renderHook(() => useNftFlowState(params));

    act(() => result.current.setValidatedRecipient('bob.sol', 'ResolvedAddr222'));
    expect(result.current.validatedRecipient).toBe('bob.sol');

    // Editing the field drops the verdict: the screen gates Confirm on it.
    act(() => result.current.setRecipient('Edited'));
    expect(result.current.validatedRecipient).toBeNull();
    expect(result.current.resolvedRecipient).toBeNull();

    act(() => result.current.setValidatedRecipient('bob.sol', 'ResolvedAddr222'));
    await act(() => result.current.submitSend());

    expect(mockSendNft).toHaveBeenCalledWith(nft, 'ResolvedAddr222');
    expect(result.current.successKind).toBe('send');
    expect(result.current.successTxId).toBe('tx123');
  });

  it('acknowledging a sent receipt settles the grid and the avatar, then resets', async () => {
    const { result } = renderHook(() => useNftFlowState(params));
    act(() => result.current.setValidatedRecipient('DestAddr111', null));
    await act(() => result.current.submitSend());

    act(() => result.current.acknowledgeSuccess());

    expect(mockSettleAfterTx).toHaveBeenCalledWith({
      accountId: 'Owner111',
      avatarAccountId: 'acct-1',
      networkId: 'solana-mainnet',
      kinds: ['balance', 'transactions', 'nfts', 'avatar-nfts'],
      removedNftMintAddresses: ['Mint111'],
    });
    await waitFor(() => expect(result.current.successKind).toBeNull());
    expect(result.current.recipient).toBe('');
  });

  it('a new flow key resets everything — a different NFT is a different flow', async () => {
    const { result, rerender } = renderHook((props) => useNftFlowState(props), {
      initialProps: { ...params, flowKey: 'Mint111' },
    });
    act(() => result.current.setValidatedRecipient('DestAddr111', null));
    await act(() => result.current.prepareBurn());

    rerender({ ...params, flowKey: 'Mint222' });

    await waitFor(() => expect(result.current.burnPreview).toBeNull());
    expect(result.current.validatedRecipient).toBeNull();
  });
});
