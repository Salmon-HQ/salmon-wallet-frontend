/**
 * Tests for Solana Transaction History Service
 *
 * Tests cover transaction fetching, filtering, and helper functions.
 * Uses Vitest 4.0.18 for testing with mocked API responses.
 *
 * Note: Tests use the backend-transformed transaction format with inputs/outputs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getRecentTransactions,
  isTransferTransaction,
  isSwapTransaction,
  isNftTransaction,
  isSuccessful,
  isFailed,
  getNetTokenAmount,
  getInvolvedTokens,
  getTransactionDate,
  getTimeAgo,
  isStakingTransaction,
  isTokenMintOrBurn,
  type SolanaTransaction,
  type SolanaTransactionPaging,
  type GetSolanaTransactionsFn,
} from './transactions';
import { getExplorerUrl, getSolscanUrl } from '../../utils/url';

// ============================================================================
// Mocks
// ============================================================================

const mockGetSolanaTransactions = vi.fn<GetSolanaTransactionsFn>();

// ============================================================================
// Test Data
// ============================================================================

const TEST_ADDRESS = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
const TEST_SIGNATURE = '5xG8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKKabc123';
const SOL_CONTRACT = 'So11111111111111111111111111111111111111112';
const USDC_CONTRACT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/**
 * Mock send transaction (SOL transfer)
 */
const MOCK_SEND_TX: SolanaTransaction = {
  signature: TEST_SIGNATURE,
  id: TEST_SIGNATURE,
  timestamp: 1640000000,
  status: 'completed',
  fee: { amount: 5000, decimals: 9, symbol: 'SOL' },
  type: 'send',
  description: 'Transfer SOL',
  inputs: [],
  outputs: [
    {
      amount: '1000000000', // 1 SOL
      decimals: 9,
      symbol: 'SOL',
      name: 'Solana',
      contract: SOL_CONTRACT,
      destination: 'RecipientAddress123',
    },
  ],
  heliusType: 'TRANSFER',
};

/**
 * Mock receive transaction
 */
const MOCK_RECEIVE_TX: SolanaTransaction = {
  signature: 'receive-signature-123',
  id: 'receive-signature-123',
  timestamp: 1640000500,
  status: 'completed',
  type: 'receive',
  description: 'Received SOL',
  inputs: [
    {
      amount: '500000000', // 0.5 SOL
      decimals: 9,
      symbol: 'SOL',
      name: 'Solana',
      contract: SOL_CONTRACT,
      source: 'SenderAddress123',
    },
  ],
  outputs: [],
  heliusType: 'TRANSFER',
};

/**
 * Mock swap transaction
 */
const MOCK_SWAP_TX: SolanaTransaction = {
  signature: 'swap-signature-123',
  id: 'swap-signature-123',
  timestamp: 1640001000,
  status: 'completed',
  fee: { amount: 10000, decimals: 9, symbol: 'SOL' },
  type: 'swap',
  description: 'Swap SOL for USDC',
  source: 'JUPITER',
  inputs: [
    {
      amount: '5000000', // 5 USDC received
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin',
      contract: USDC_CONTRACT,
      source: 'JupiterProgram',
    },
  ],
  outputs: [
    {
      amount: '1000000000', // 1 SOL sent
      decimals: 9,
      symbol: 'SOL',
      name: 'Solana',
      contract: SOL_CONTRACT,
      destination: 'JupiterProgram',
    },
  ],
  heliusType: 'SWAP',
};

/**
 * Mock NFT transaction
 */
const MOCK_NFT_TX: SolanaTransaction = {
  signature: 'nft-signature-123',
  id: 'nft-signature-123',
  timestamp: 1640002000,
  status: 'completed',
  fee: { amount: 5000, decimals: 9, symbol: 'SOL' },
  type: 'mint',
  description: 'NFT Mint',
  inputs: [
    {
      amount: '1',
      decimals: 0,
      symbol: 'MYCO',
      name: 'My Collection',
      contract: 'NftMintAddress123',
      isNft: true,
    },
  ],
  outputs: [],
  heliusType: 'NFT_MINT',
};

/**
 * Mock failed transaction
 */
const MOCK_FAILED_TX: SolanaTransaction = {
  signature: 'failed-signature-123',
  id: 'failed-signature-123',
  timestamp: 1640003000,
  status: 'failed',
  fee: { amount: 5000, decimals: 9, symbol: 'SOL' },
  type: 'send',
  description: 'Failed transfer',
  inputs: [],
  outputs: [],
  heliusType: 'TRANSFER',
};

/**
 * Mock stake transaction
 */
const MOCK_STAKE_TX: SolanaTransaction = {
  signature: 'stake-signature-123',
  id: 'stake-signature-123',
  timestamp: 1640004000,
  status: 'completed',
  fee: { amount: 5000, decimals: 9, symbol: 'SOL' },
  type: 'stake',
  description: 'Stake SOL',
  inputs: [],
  outputs: [],
  heliusType: 'STAKE',
};

/**
 * Mock mint transaction (token)
 */
const MOCK_MINT_TX: SolanaTransaction = {
  signature: 'mint-signature-123',
  id: 'mint-signature-123',
  timestamp: 1640005000,
  status: 'completed',
  fee: { amount: 5000, decimals: 9, symbol: 'SOL' },
  type: 'mint',
  description: 'Token Mint',
  inputs: [
    {
      amount: '1000000',
      decimals: 6,
      symbol: 'MYTKN',
      name: 'My Token',
      contract: 'TokenMintAddress123',
    },
  ],
  outputs: [],
  heliusType: 'TOKEN_MINT',
};

/**
 * Mock burn transaction
 */
const MOCK_BURN_TX: SolanaTransaction = {
  signature: 'burn-signature-123',
  id: 'burn-signature-123',
  timestamp: 1640006000,
  status: 'completed',
  type: 'burn',
  description: 'Token Burn',
  inputs: [],
  outputs: [
    {
      amount: '500000',
      decimals: 6,
      symbol: 'MYTKN',
      name: 'My Token',
      contract: 'TokenMintAddress123',
    },
  ],
  heliusType: 'TOKEN_BURN',
};

// ============================================================================
// Tests
// ============================================================================

describe('Solana Transaction History Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // --------------------------------------------------------------------------
  // API Function Tests
  // --------------------------------------------------------------------------

  describe('getRecentTransactions', () => {
    it('should fetch recent transactions without paging', async () => {
      const mockResponse = {
        transactions: [MOCK_SEND_TX, MOCK_RECEIVE_TX],
        oldestSignature: 'oldest-sig',
        hasMore: true,
      };
      mockGetSolanaTransactions.mockResolvedValue(mockResponse);

      const result = await getRecentTransactions(
        'solana-mainnet',
        TEST_ADDRESS,
        undefined,
        mockGetSolanaTransactions
      );

      expect(result.data).toEqual([MOCK_SEND_TX, MOCK_RECEIVE_TX]);
      expect(result.pageToken).toBe('oldest-sig');
      expect(mockGetSolanaTransactions).toHaveBeenCalledWith('solana-mainnet', TEST_ADDRESS, {});
    });

    it('should fetch transactions with paging parameters', async () => {
      const mockResponse = {
        transactions: [MOCK_SWAP_TX],
        oldestSignature: null,
        hasMore: false,
      };
      mockGetSolanaTransactions.mockResolvedValue(mockResponse);

      const paging: SolanaTransactionPaging = {
        nextPageToken: 'page-token-123',
        pageSize: 20,
      };
      const result = await getRecentTransactions(
        'solana-mainnet',
        TEST_ADDRESS,
        paging,
        mockGetSolanaTransactions
      );

      expect(result.data).toEqual([MOCK_SWAP_TX]);
      expect(result.pageToken).toBeUndefined();
      expect(mockGetSolanaTransactions).toHaveBeenCalledWith('solana-mainnet', TEST_ADDRESS, {
        before: 'page-token-123',
        limit: 20,
      });
    });
  });

  // --------------------------------------------------------------------------
  // Helper Function Tests
  // --------------------------------------------------------------------------

  describe('isTransferTransaction', () => {
    it('should return true for send transactions', () => {
      expect(isTransferTransaction(MOCK_SEND_TX)).toBe(true);
    });

    it('should return true for receive transactions', () => {
      expect(isTransferTransaction(MOCK_RECEIVE_TX)).toBe(true);
    });

    it('should return false for swap transactions', () => {
      expect(isSwapTransaction(MOCK_SEND_TX)).toBe(false);
    });
  });

  describe('isSwapTransaction', () => {
    it('should return true for swap transactions', () => {
      expect(isSwapTransaction(MOCK_SWAP_TX)).toBe(true);
    });

    it('should return false for non-swap transactions', () => {
      expect(isSwapTransaction(MOCK_SEND_TX)).toBe(false);
    });
  });

  describe('isNftTransaction', () => {
    it('should return true for NFT transactions', () => {
      expect(isNftTransaction(MOCK_NFT_TX)).toBe(true);
    });

    it('should return false for non-NFT transactions', () => {
      expect(isNftTransaction(MOCK_SEND_TX)).toBe(false);
    });
  });

  describe('isSuccessful', () => {
    it('should return true for completed transactions', () => {
      expect(isSuccessful(MOCK_SEND_TX)).toBe(true);
    });

    it('should return false for failed transactions', () => {
      expect(isSuccessful(MOCK_FAILED_TX)).toBe(false);
    });
  });

  describe('isFailed', () => {
    it('should return true for failed transactions', () => {
      expect(isFailed(MOCK_FAILED_TX)).toBe(true);
    });

    it('should return false for successful transactions', () => {
      expect(isFailed(MOCK_SEND_TX)).toBe(false);
    });
  });

  describe('getNetTokenAmount', () => {
    it('should return positive amount for received tokens', () => {
      const result = getNetTokenAmount(MOCK_RECEIVE_TX, SOL_CONTRACT);

      expect(result).toEqual({
        amount: '500000000',
        decimals: 9,
        symbol: 'SOL',
      });
    });

    it('should return negative amount for sent tokens', () => {
      const result = getNetTokenAmount(MOCK_SEND_TX, SOL_CONTRACT);

      expect(result).toEqual({
        amount: '-1000000000',
        decimals: 9,
        symbol: 'SOL',
      });
    });

    it('should return null for tokens not in transaction', () => {
      const result = getNetTokenAmount(MOCK_SEND_TX, 'UnknownMintAddress');

      expect(result).toBeNull();
    });
  });

  describe('getInvolvedTokens', () => {
    it('should return all unique token contracts', () => {
      const result = getInvolvedTokens(MOCK_SWAP_TX);

      expect(result).toContain(SOL_CONTRACT);
      expect(result).toContain(USDC_CONTRACT);
      expect(result.length).toBe(2);
    });

    it('should return empty array for transactions with no tokens', () => {
      const txWithNoTokens: SolanaTransaction = {
        ...MOCK_FAILED_TX,
        inputs: [],
        outputs: [],
      };
      const result = getInvolvedTokens(txWithNoTokens);

      expect(result).toEqual([]);
    });
  });

  describe('getTransactionDate', () => {
    it('should return Date object from timestamp', () => {
      const result = getTransactionDate(MOCK_SEND_TX);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(1640000000 * 1000);
    });
  });

  describe('getTimeAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1640000000 * 1000 + 3600000)); // 1 hour after tx
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "1h ago" for transaction 1 hour old', () => {
      expect(getTimeAgo(MOCK_SEND_TX)).toBe('1h ago');
    });

    it('should return "Just now" for very recent transactions', () => {
      vi.setSystemTime(new Date(1640000000 * 1000 + 30000)); // 30 seconds after
      expect(getTimeAgo(MOCK_SEND_TX)).toBe('Just now');
    });

    it('should return correct days ago', () => {
      vi.setSystemTime(new Date(1640000000 * 1000 + 86400000 * 3)); // 3 days after
      expect(getTimeAgo(MOCK_SEND_TX)).toBe('3d ago');
    });
  });

  describe('isStakingTransaction', () => {
    it('should return true for stake transactions', () => {
      expect(isStakingTransaction(MOCK_STAKE_TX)).toBe(true);
    });

    it('should return false for non-stake transactions', () => {
      expect(isStakingTransaction(MOCK_SEND_TX)).toBe(false);
    });
  });

  describe('isTokenMintOrBurn', () => {
    it('should return true for mint transactions', () => {
      expect(isTokenMintOrBurn(MOCK_MINT_TX)).toBe(true);
    });

    it('should return true for burn transactions', () => {
      expect(isTokenMintOrBurn(MOCK_BURN_TX)).toBe(true);
    });

    it('should return false for other transactions', () => {
      expect(isTokenMintOrBurn(MOCK_SEND_TX)).toBe(false);
    });
  });

  describe('getExplorerUrl', () => {
    it('should return mainnet explorer URL', () => {
      const url = getExplorerUrl(TEST_SIGNATURE, 'solana-mainnet');

      expect(url).toBe(`https://explorer.solana.com/tx/${TEST_SIGNATURE}`);
    });

    it('should return devnet explorer URL', () => {
      const url = getExplorerUrl(TEST_SIGNATURE, 'solana-devnet');

      expect(url).toBe(`https://explorer.solana.com/tx/${TEST_SIGNATURE}?cluster=devnet`);
    });
  });

  describe('getSolscanUrl', () => {
    it('should return mainnet Solscan URL', () => {
      const url = getSolscanUrl(TEST_SIGNATURE, 'solana-mainnet');

      expect(url).toBe(`https://solscan.io/tx/${TEST_SIGNATURE}`);
    });

    it('should return devnet Solscan URL', () => {
      const url = getSolscanUrl(TEST_SIGNATURE, 'solana-devnet');

      expect(url).toBe(`https://solscan.io/tx/${TEST_SIGNATURE}?cluster=devnet`);
    });
  });
});
