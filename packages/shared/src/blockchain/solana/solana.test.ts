/**
 * Tests for Solana blockchain module
 *
 * Tests cover pure functions and deterministic account derivation.
 * Uses Vitest 4.0.18 for testing.
 */

import { describe, it, expect, vi } from 'vitest';
import { PublicKey } from '@solana/web3.js';

// Factory functions
import { getSolanaDerivationPath, createSolanaAccount } from './factory';

// Transfer utilities
import {
  SOL_ADDRESS,
} from './transfer';
import { applyDecimals, removeDecimals } from '../../utils/decimals';
import { isNativeSol } from '../../utils/tokens';

// SolanaAccount class
import { SolanaAccount } from './SolanaAccount';

// NFT utilities
import {
  getCollections,
  getNftsByCollection,
  getNftsWithoutCollection,
  isCollection,
  isMoreThanOne,
} from './nft';
import type { Nft, NftCollectionGroup } from '../../types/nft';

// Swap utilities
import { getExpectedOutput, getMinimumOutput, getPriceImpact } from './swap';
import type { SwapQuote } from '../../types/swap';

// Import SOLANA_NETWORKS for network configuration
import { SOLANA_NETWORKS } from './factory';

// ============================================================================
// Test Constants
// ============================================================================

/**
 * Standard BIP39 test mnemonic (12 words)
 * Used for deterministic key derivation testing
 */
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

/**
 * Expected addresses for the test mnemonic at various derivation indices
 * These addresses should be deterministic and reproducible
 * Generated from the standard BIP39 test mnemonic using Solana's derivation path
 */
const EXPECTED_ADDRESSES = {
  0: 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk',
  1: 'Hh8QwFUA6MtVu1qAoq12ucvFHNwCcVTV7hpWjeY1Hztb',
  5: '2EUrWmf5xMmWER9BtDbXbGbZjoL7R3eTDMXYR6H6cKPj',
};

const mockSolanaApiFunctions = {
  fetchBalance: vi.fn().mockResolvedValue([]),
  fetchPrices: vi.fn().mockResolvedValue(null),
  fetchTransaction: vi.fn().mockResolvedValue(null),
  fetchTransactions: vi.fn().mockResolvedValue({ transactions: [], oldestSignature: null, hasMore: false }),
  fetchNfts: vi.fn().mockResolvedValue([]),
};

// ============================================================================
// 1. getSolanaDerivationPath Tests
// ============================================================================

describe('getSolanaDerivationPath', () => {
  it('should generate correct derivation path for index 0', () => {
    const path = getSolanaDerivationPath(0);
    expect(path).toBe("m/44'/501'/0'/0'");
  });

  it('should generate correct derivation path for index 1', () => {
    const path = getSolanaDerivationPath(1);
    expect(path).toBe("m/44'/501'/1'/0'");
  });

  it('should generate correct derivation path for index 5', () => {
    const path = getSolanaDerivationPath(5);
    expect(path).toBe("m/44'/501'/5'/0'");
  });

  it('should generate different paths for different indices', () => {
    const path0 = getSolanaDerivationPath(0);
    const path1 = getSolanaDerivationPath(1);
    const path5 = getSolanaDerivationPath(5);

    expect(path0).not.toBe(path1);
    expect(path1).not.toBe(path5);
    expect(path0).not.toBe(path5);
  });
});

// ============================================================================
// 2. applyDecimals Tests
// ============================================================================

describe('applyDecimals', () => {
  it('should convert 1.5 with 6 decimals to 1500000', () => {
    const result = applyDecimals(1.5, 6);
    expect(result).toBe(1500000);
  });

  it('should convert 1.0 with 9 decimals to 1000000000', () => {
    const result = applyDecimals(1.0, 9);
    expect(result).toBe(1000000000);
  });

  it('should convert 0.001 with 6 decimals to 1000', () => {
    const result = applyDecimals(0.001, 6);
    expect(result).toBe(1000);
  });

  it('should handle zero amount', () => {
    const result = applyDecimals(0, 6);
    expect(result).toBe(0);
  });

  it('should handle integer amounts', () => {
    const result = applyDecimals(100, 6);
    expect(result).toBe(100000000);
  });

  it('should handle zero decimals', () => {
    const result = applyDecimals(1.5, 0);
    expect(result).toBe(2); // Rounds to nearest integer
  });
});

// ============================================================================
// 3. removeDecimals Tests
// ============================================================================

describe('removeDecimals', () => {
  it('should convert 1500000 with 6 decimals to 1.5', () => {
    const result = removeDecimals(1500000, 6);
    expect(result).toBe(1.5);
  });

  it('should convert 1000000000 with 9 decimals to 1.0', () => {
    const result = removeDecimals(1000000000, 9);
    expect(result).toBe(1.0);
  });

  it('should convert 1000 with 6 decimals to 0.001', () => {
    const result = removeDecimals(1000, 6);
    expect(result).toBe(0.001);
  });

  it('should handle zero amount', () => {
    const result = removeDecimals(0, 6);
    expect(result).toBe(0);
  });

  it('should handle bigint amounts', () => {
    const result = removeDecimals(BigInt(1500000), 6);
    expect(result).toBe(1.5);
  });

  it('should handle zero decimals', () => {
    const result = removeDecimals(100, 0);
    expect(result).toBe(100);
  });

  it('should be inverse of applyDecimals', () => {
    const original = 1.5;
    const decimals = 6;
    const applied = applyDecimals(original, decimals);
    const removed = removeDecimals(applied, decimals);
    expect(removed).toBe(original);
  });
});

// ============================================================================
// 4. isNativeSol Tests
// ============================================================================

describe('isNativeSol', () => {
  it('should return true for SOL_ADDRESS', () => {
    expect(isNativeSol(SOL_ADDRESS)).toBe(true);
  });

  it('should return true for null', () => {
    expect(isNativeSol(null)).toBe(true);
  });

  it('should return true for undefined', () => {
    expect(isNativeSol(undefined)).toBe(true);
  });

  it('should return false for other addresses', () => {
    expect(isNativeSol('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(false);
  });

  it('should return false for empty string', () => {
    // Empty string should NOT be treated as native SOL
    expect(isNativeSol('')).toBe(false);
  });

  it('should return false for arbitrary strings', () => {
    expect(isNativeSol('some-random-address')).toBe(false);
  });
});

// ============================================================================
// 5. SolanaAccount.isValidAddress Tests
// ============================================================================

describe('SolanaAccount.isValidAddress', () => {
  it('should return true for valid base58 Solana addresses', () => {
    // Native SOL address
    expect(SolanaAccount.isValidAddress(SOL_ADDRESS)).toBe(true);

    // USDC address
    expect(SolanaAccount.isValidAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(true);

    // Random valid address
    expect(SolanaAccount.isValidAddress('11111111111111111111111111111111')).toBe(true);
  });

  it('should return false for invalid addresses', () => {
    // Empty string
    expect(SolanaAccount.isValidAddress('')).toBe(false);

    // Invalid base58
    expect(SolanaAccount.isValidAddress('invalid-address-123')).toBe(false);

    // Too short
    expect(SolanaAccount.isValidAddress('abc')).toBe(false);

    // Invalid characters
    expect(SolanaAccount.isValidAddress('0OIl@#$%^&*()')).toBe(false);
  });

  it('should handle edge cases', () => {
    // Null-like strings
    expect(SolanaAccount.isValidAddress('null')).toBe(false);
    expect(SolanaAccount.isValidAddress('undefined')).toBe(false);
  });
});

// ============================================================================
// 6. getCollections Tests
// ============================================================================

describe('getCollections', () => {
  const mockNfts: Nft[] = [
    {
      mint: { address: '1' },
      owner: 'owner1',
      name: 'NFT 1',
      symbol: 'NFT1',
      uri: 'uri1',
      json: {},
      updateAuthorityAddress: null,
      sellerFeeBasisPoints: 0,
      collection: { key: 'collection1', verified: true, name: 'Collection A' },
      edition: null,
      tokenStandard: null,
      media: null,
      description: '',
      compressed: false,
      extras: { attributes: [], properties: {}, creators: [] },
      extensions: [],
    },
    {
      mint: { address: '2' },
      owner: 'owner1',
      name: 'NFT 2',
      symbol: 'NFT2',
      uri: 'uri2',
      json: {},
      updateAuthorityAddress: null,
      sellerFeeBasisPoints: 0,
      collection: { key: 'collection2', verified: true, name: 'Collection B' },
      edition: null,
      tokenStandard: null,
      media: null,
      description: '',
      compressed: false,
      extras: { attributes: [], properties: {}, creators: [] },
      extensions: [],
    },
    {
      mint: { address: '3' },
      owner: 'owner1',
      name: 'NFT 3',
      symbol: 'NFT3',
      uri: 'uri3',
      json: {},
      updateAuthorityAddress: null,
      sellerFeeBasisPoints: 0,
      collection: { key: 'collection1', verified: true, name: 'Collection A' },
      edition: null,
      tokenStandard: null,
      media: null,
      description: '',
      compressed: false,
      extras: { attributes: [], properties: {}, creators: [] },
      extensions: [],
    },
    {
      mint: { address: '4' },
      owner: 'owner1',
      name: 'NFT 4',
      symbol: 'NFT4',
      uri: 'uri4',
      json: {},
      updateAuthorityAddress: null,
      sellerFeeBasisPoints: 0,
      collection: null,
      edition: null,
      tokenStandard: null,
      media: null,
      description: '',
      compressed: false,
      extras: { attributes: [], properties: {}, creators: [] },
      extensions: [],
    },
  ];

  it('should extract unique collection names', () => {
    const collections = getCollections(mockNfts);
    expect(collections).toEqual(['Collection A', 'Collection B']);
  });

  it('should return empty array for NFTs without collections', () => {
    const nftsWithoutCollection = mockNfts.filter(nft => !nft.collection);
    const collections = getCollections(nftsWithoutCollection);
    expect(collections).toEqual([]);
  });

  it('should handle empty NFT array', () => {
    const collections = getCollections([]);
    expect(collections).toEqual([]);
  });

  it('should not duplicate collection names', () => {
    const collections = getCollections(mockNfts);
    const uniqueCollections = Array.from(new Set(collections));
    expect(collections.length).toBe(uniqueCollections.length);
  });
});

// ============================================================================
// 7. getNftsByCollection Tests
// ============================================================================

describe('getNftsByCollection', () => {
  const mockNfts: Nft[] = [
    {
      mint: { address: '1' },
      owner: 'owner1',
      name: 'NFT 1',
      symbol: 'NFT1',
      uri: 'uri1',
      json: {},
      updateAuthorityAddress: null,
      sellerFeeBasisPoints: 0,
      collection: { key: 'collection1', verified: true, name: 'Collection A' },
      edition: null,
      tokenStandard: null,
      media: 'media1',
      description: '',
      compressed: false,
      extras: { attributes: [], properties: {}, creators: [] },
      extensions: [],
    },
    {
      mint: { address: '2' },
      owner: 'owner1',
      name: 'NFT 2',
      symbol: 'NFT2',
      uri: 'uri2',
      json: {},
      updateAuthorityAddress: null,
      sellerFeeBasisPoints: 0,
      collection: { key: 'collection1', verified: true, name: 'Collection A' },
      edition: null,
      tokenStandard: null,
      media: 'media2',
      description: '',
      compressed: false,
      extras: { attributes: [], properties: {}, creators: [] },
      extensions: [],
    },
    {
      mint: { address: '3' },
      owner: 'owner1',
      name: 'NFT 3',
      symbol: 'NFT3',
      uri: 'uri3',
      json: {},
      updateAuthorityAddress: null,
      sellerFeeBasisPoints: 0,
      collection: { key: 'collection2', verified: true, name: 'Collection B' },
      edition: null,
      tokenStandard: null,
      media: 'media3',
      description: '',
      compressed: false,
      extras: { attributes: [], properties: {}, creators: [] },
      extensions: [],
    },
  ];

  it('should group NFTs by collection', () => {
    const grouped = getNftsByCollection(mockNfts);

    expect(grouped).toHaveLength(2);
    expect(grouped[0].collection).toBe('Collection A');
    expect(grouped[0].length).toBe(2);
    expect(grouped[0].items).toHaveLength(2);
    expect(grouped[1].collection).toBe('Collection B');
    expect(grouped[1].length).toBe(1);
  });

  it('should sort collections by size (largest first)', () => {
    const grouped = getNftsByCollection(mockNfts);

    expect(grouped[0].length).toBeGreaterThanOrEqual(grouped[1].length);
  });

  it('should set thumbnail from first NFT in collection', () => {
    const grouped = getNftsByCollection(mockNfts);

    expect(grouped[0].thumb).toBe('media1');
    expect(grouped[1].thumb).toBe('media3');
  });

  it('should handle empty NFT array', () => {
    const grouped = getNftsByCollection([]);
    expect(grouped).toEqual([]);
  });
});

// ============================================================================
// 8. getNftsWithoutCollection Tests
// ============================================================================

describe('getNftsWithoutCollection', () => {
  const mockNfts: Nft[] = [
    {
      mint: { address: '1' },
      owner: 'owner1',
      name: 'NFT 1',
      symbol: 'NFT1',
      uri: 'uri1',
      json: {},
      updateAuthorityAddress: null,
      sellerFeeBasisPoints: 0,
      collection: { key: 'collection1', verified: true, name: 'Collection A' },
      edition: null,
      tokenStandard: null,
      media: null,
      description: '',
      compressed: false,
      extras: { attributes: [], properties: {}, creators: [] },
      extensions: [],
    },
    {
      mint: { address: '2' },
      owner: 'owner1',
      name: 'NFT 2',
      symbol: 'NFT2',
      uri: 'uri2',
      json: {},
      updateAuthorityAddress: null,
      sellerFeeBasisPoints: 0,
      collection: null,
      edition: null,
      tokenStandard: null,
      media: null,
      description: '',
      compressed: false,
      extras: { attributes: [], properties: {}, creators: [] },
      extensions: [],
    },
    {
      mint: { address: '3' },
      owner: 'owner1',
      name: 'NFT 3',
      symbol: 'NFT3',
      uri: 'uri3',
      json: {},
      updateAuthorityAddress: null,
      sellerFeeBasisPoints: 0,
      collection: { key: 'collection2', verified: false, name: undefined },
      edition: null,
      tokenStandard: null,
      media: null,
      description: '',
      compressed: false,
      extras: { attributes: [], properties: {}, creators: [] },
      extensions: [],
    },
  ];

  it('should filter NFTs without collection name', () => {
    const withoutCollection = getNftsWithoutCollection(mockNfts);

    expect(withoutCollection).toHaveLength(2);
    expect(withoutCollection[0].mint.address).toBe('2');
    expect(withoutCollection[1].mint.address).toBe('3');
  });

  it('should return empty array when all NFTs have collections', () => {
    const nftsWithCollections = mockNfts.filter(nft => nft.collection?.name);
    const withoutCollection = getNftsWithoutCollection(nftsWithCollections);

    expect(withoutCollection).toEqual([]);
  });

  it('should handle empty NFT array', () => {
    const withoutCollection = getNftsWithoutCollection([]);
    expect(withoutCollection).toEqual([]);
  });
});

// ============================================================================
// 9. isCollection Tests
// ============================================================================

describe('isCollection', () => {
  const mockCollection: NftCollectionGroup = {
    collection: 'Test Collection',
    length: 2,
    items: [
      {
        mint: { address: '1' },
        owner: 'owner1',
        name: 'NFT 1',
        symbol: 'NFT1',
        uri: 'uri1',
        json: {},
        updateAuthorityAddress: null,
        sellerFeeBasisPoints: 0,
        collection: null,
        edition: null,
        tokenStandard: null,
        media: null,
        description: '',
        compressed: false,
        extras: { attributes: [], properties: {}, creators: [] },
        extensions: [],
      },
    ],
    thumb: null,
  };

  const mockNft: Nft = {
    mint: { address: '1' },
    owner: 'owner1',
    name: 'NFT 1',
    symbol: 'NFT1',
    uri: 'uri1',
    json: {},
    updateAuthorityAddress: null,
    sellerFeeBasisPoints: 0,
    collection: null,
    edition: null,
    tokenStandard: null,
    media: null,
    description: '',
    compressed: false,
    extras: { attributes: [], properties: {}, creators: [] },
    extensions: [],
  };

  it('should return true for collection groups', () => {
    expect(isCollection(mockCollection)).toBe(true);
  });

  it('should return false for individual NFTs', () => {
    expect(isCollection(mockNft)).toBe(false);
  });
});

// ============================================================================
// 10. isMoreThanOne Tests
// ============================================================================

describe('isMoreThanOne', () => {
  const mockCollectionMultiple: NftCollectionGroup = {
    collection: 'Test Collection',
    length: 2,
    items: [
      {
        mint: { address: '1' },
        owner: 'owner1',
        name: 'NFT 1',
        symbol: 'NFT1',
        uri: 'uri1',
        json: {},
        updateAuthorityAddress: null,
        sellerFeeBasisPoints: 0,
        collection: null,
        edition: null,
        tokenStandard: null,
        media: null,
        description: '',
        compressed: false,
        extras: { attributes: [], properties: {}, creators: [] },
        extensions: [],
      },
      {
        mint: { address: '2' },
        owner: 'owner1',
        name: 'NFT 2',
        symbol: 'NFT2',
        uri: 'uri2',
        json: {},
        updateAuthorityAddress: null,
        sellerFeeBasisPoints: 0,
        collection: null,
        edition: null,
        tokenStandard: null,
        media: null,
        description: '',
        compressed: false,
        extras: { attributes: [], properties: {}, creators: [] },
        extensions: [],
      },
    ],
    thumb: null,
  };

  const mockCollectionSingle: NftCollectionGroup = {
    collection: 'Test Collection',
    length: 1,
    items: [
      {
        mint: { address: '1' },
        owner: 'owner1',
        name: 'NFT 1',
        symbol: 'NFT1',
        uri: 'uri1',
        json: {},
        updateAuthorityAddress: null,
        sellerFeeBasisPoints: 0,
        collection: null,
        edition: null,
        tokenStandard: null,
        media: null,
        description: '',
        compressed: false,
        extras: { attributes: [], properties: {}, creators: [] },
        extensions: [],
      },
    ],
    thumb: null,
  };

  const mockNft: Nft = {
    mint: { address: '1' },
    owner: 'owner1',
    name: 'NFT 1',
    symbol: 'NFT1',
    uri: 'uri1',
    json: {},
    updateAuthorityAddress: null,
    sellerFeeBasisPoints: 0,
    collection: null,
    edition: null,
    tokenStandard: null,
    media: null,
    description: '',
    compressed: false,
    extras: { attributes: [], properties: {}, creators: [] },
    extensions: [],
  };

  it('should return true for collections with more than one item', () => {
    expect(isMoreThanOne(mockCollectionMultiple)).toBe(true);
  });

  it('should return false for collections with one item', () => {
    expect(isMoreThanOne(mockCollectionSingle)).toBe(false);
  });

  it('should return false for individual NFTs', () => {
    expect(isMoreThanOne(mockNft)).toBe(false);
  });

  it('should return false for empty collections', () => {
    const emptyCollection: NftCollectionGroup = {
      collection: 'Empty',
      length: 0,
      items: [],
      thumb: null,
    };
    expect(isMoreThanOne(emptyCollection)).toBe(false);
  });
});

// ============================================================================
// 11. getExpectedOutput Tests
// ============================================================================

describe('getExpectedOutput', () => {
  const mockQuote: SwapQuote = {
    networkId: 'solana-mainnet',
    routeNames: ['Raydium'],
    routeSymbols: ['SOL', 'USDC'],
    fee: { amount: 5000, decimals: 9, symbol: 'SOL', percent: 0.5 },
    input: {
      amount: '1000000000',
      decimals: 9,
      symbol: 'SOL',
      contract: 'So11111111111111111111111111111111111111112',
    },
    output: {
      amount: '5000000',
      decimals: 6,
      symbol: 'USDC',
      contract: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
    custom: {
      transaction: '',
      requestId: 'test-request-id',
      router: 'iris',
      priceImpact: 0.12,
      feeBps: 50,
      prioritizationFeeLamports: 1000,
      rentFeeLamports: 5616,
      gasless: false,
      slippageBps: 50,
      swapMode: 'ExactIn',
      otherAmountThreshold: '4950000',
    },
  };

  it('should calculate expected output using quote decimals', () => {
    const output = getExpectedOutput(mockQuote);
    expect(output).toBe(5); // 5000000 / 10^6 = 5
  });

  it('should calculate expected output using provided decimals', () => {
    const output = getExpectedOutput(mockQuote, 6);
    expect(output).toBe(5); // 5000000 / 10^6 = 5
  });

  it('should handle missing outputToken decimals', () => {
    const quoteWithoutDecimals = {
      ...mockQuote,
      outputToken: undefined,
    };
    const output = getExpectedOutput(quoteWithoutDecimals, 6);
    expect(output).toBe(5);
  });

  it('should default to 9 decimals when no decimals provided', () => {
    const quoteWithoutDecimals: SwapQuote = {
      ...mockQuote,
      output: {
        ...mockQuote.output!,
        decimals: undefined as any,
      },
    };
    const output = getExpectedOutput(quoteWithoutDecimals);
    expect(output).toBe(0.005); // 5000000 / 10^9 = 0.005
  });
});

// ============================================================================
// 12. getMinimumOutput Tests
// ============================================================================

describe('getMinimumOutput', () => {
  const mockQuote: SwapQuote = {
    networkId: 'solana-mainnet',
    routeNames: ['Raydium'],
    routeSymbols: ['SOL', 'USDC'],
    fee: { amount: 5000, decimals: 9, symbol: 'SOL', percent: 0.5 },
    input: {
      amount: '1000000000',
      decimals: 9,
      symbol: 'SOL',
      contract: 'So11111111111111111111111111111111111111112',
    },
    output: {
      amount: '5000000',
      decimals: 6,
      symbol: 'USDC',
      contract: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
    custom: {
      transaction: '',
      requestId: 'test-request-id',
      router: 'iris',
      priceImpact: 0.12,
      feeBps: 50,
      prioritizationFeeLamports: 1000,
      rentFeeLamports: 5616,
      gasless: false,
      slippageBps: 50,
      swapMode: 'ExactIn',
      otherAmountThreshold: '4950000',
    },
  };

  it('should calculate minimum output using quote decimals', () => {
    const output = getMinimumOutput(mockQuote);
    expect(output).toBe(4.95); // 4950000 / 10^6 = 4.95
  });

  it('should calculate minimum output using provided decimals', () => {
    const output = getMinimumOutput(mockQuote, 6);
    expect(output).toBe(4.95); // 4950000 / 10^6 = 4.95
  });

  it('should handle missing outputToken decimals', () => {
    const quoteWithoutDecimals: SwapQuote = {
      ...mockQuote,
      output: {
        ...mockQuote.output!,
        decimals: undefined as any,
      },
    };
    const output = getMinimumOutput(quoteWithoutDecimals, 6);
    expect(output).toBe(4.95);
  });

  it('should be less than expected output due to slippage', () => {
    const expected = getExpectedOutput(mockQuote);
    const minimum = getMinimumOutput(mockQuote);
    expect(minimum).toBeLessThan(expected);
  });
});

// ============================================================================
// 13. getPriceImpact Tests
// ============================================================================

describe('getPriceImpact', () => {
  const createMockQuote = (priceImpact: string): SwapQuote => ({
    networkId: 'solana-mainnet',
    routeNames: ['Raydium'],
    routeSymbols: ['SOL', 'USDC'],
    fee: { amount: 5000, decimals: 9, symbol: 'SOL', percent: 0.5 },
    input: {
      amount: '1000000000',
      decimals: 9,
      symbol: 'SOL',
      contract: 'So11111111111111111111111111111111111111112',
    },
    output: {
      amount: '5000000',
      decimals: 6,
      symbol: 'USDC',
      contract: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
    custom: {
      transaction: '',
      requestId: 'test-request-id',
      router: 'iris',
      priceImpact: parseFloat(priceImpact),
      feeBps: 50,
      prioritizationFeeLamports: 1000,
      rentFeeLamports: 5616,
      gasless: false,
      slippageBps: 50,
      swapMode: 'ExactIn',
      otherAmountThreshold: '4950000',
    },
  });

  it('should extract price impact from quote', () => {
    const quote = createMockQuote('0.12');
    const impact = getPriceImpact(quote);
    expect(impact).toBe(0.12);
  });

  it('should handle zero price impact', () => {
    const quote = createMockQuote('0.00');
    const impact = getPriceImpact(quote);
    expect(impact).toBe(0.00);
  });

  it('should handle high price impact', () => {
    const quote = createMockQuote('5.67');
    const impact = getPriceImpact(quote);
    expect(impact).toBe(5.67);
  });

  it('should handle negative price impact', () => {
    const quote = createMockQuote('-0.05');
    const impact = getPriceImpact(quote);
    expect(impact).toBe(-0.05);
  });
});

// ============================================================================
// 14. createSolanaAccount Tests (Deterministic Derivation)
// ============================================================================

describe('createSolanaAccount - Deterministic Derivation', () => {
  const network = SOLANA_NETWORKS['solana-devnet'];

  it('should derive account at index 0 with expected address', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    const address = account.getReceiveAddress();
    expect(address).toBe(EXPECTED_ADDRESSES[0]);
  });

  it('should derive account at index 1 with expected address', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 1,
      apiFunctions: mockSolanaApiFunctions,
    });

    const address = account.getReceiveAddress();
    expect(address).toBe(EXPECTED_ADDRESSES[1]);
  });

  it('should derive account at index 5 with expected address', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 5,
      apiFunctions: mockSolanaApiFunctions,
    });

    const address = account.getReceiveAddress();
    expect(address).toBe(EXPECTED_ADDRESSES[5]);
  });

  it('should derive different addresses for different indices', async () => {
    const account0 = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    const account1 = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 1,
      apiFunctions: mockSolanaApiFunctions,
    });

    const address0 = account0.getReceiveAddress();
    const address1 = account1.getReceiveAddress();

    expect(address0).not.toBe(address1);
  });

  it('should create valid public key', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    const publicKey = account.getPublicKey();
    // web3.js parity: the same base58 the legacy `PublicKey` produced, now as
    // the kit `Address` string it always was underneath.
    expect(new PublicKey(publicKey).toBase58()).toBe(EXPECTED_ADDRESSES[0]);
    expect(publicKey).toBe(EXPECTED_ADDRESSES[0]);
  });

  it('should set correct account properties', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 3,
      apiFunctions: mockSolanaApiFunctions,
    });

    expect(account.index).toBe(3);
    expect(account.path).toBe("m/44'/501'/3'/0'");
    expect(account.network).toBe(network);
  });

  it('should default to index 0 when not specified', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      apiFunctions: mockSolanaApiFunctions,
    });

    expect(account.index).toBe(0);
    expect(account.getReceiveAddress()).toBe(EXPECTED_ADDRESSES[0]);
  });

  it('should be deterministic - same mnemonic and index always produce same address', async () => {
    const account1 = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    const account2 = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    expect(account1.getReceiveAddress()).toBe(account2.getReceiveAddress());
  });
});
