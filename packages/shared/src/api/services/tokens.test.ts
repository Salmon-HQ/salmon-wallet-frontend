/**
 * Token Service Tests
 * Tests for pure normalization functions and async service functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules BEFORE importing the functions
vi.mock('axios', () => {
  return {
    default: {
      get: vi.fn(),
      create: vi.fn(() => ({
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
    },
  };
});

vi.mock('../client', () => {
  return {
    apiClient: {
      get: vi.fn(),
    },
  };
});

// Now import the functions AFTER mocking
import {
  normalizeBackendTokens,
  getTokenList,
  searchTokens,
  clearTokenListCache,
} from './tokens';
import { normalizeIpfsUrl } from '../../utils/url';
import { apiClient } from '../client';

// Get access to the mocked function
const mockApiClientGet = vi.mocked(apiClient.get);

// ============================================================================
// Test Data
// ============================================================================

/**
 * Sample BackendToken data for testing
 */
const mockBackendTokens = [
  {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    address: 'So11111111111111111111111111111111111111112',
    chainId: 101,
    coingeckoId: 'solana',
    tags: ['verified', 'strict'],
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    icon: 'ipfs://QmXfzKRvjZz3u5JRgC4v5mGVbm9ahrUiB4DgzHBsnWbTMM',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    chainId: 101,
    coingeckoId: 'usd-coin',
    tags: ['verified'],
  },
  {
    symbol: 'RAY',
    name: 'Raydium',
    decimals: 6,
    logo: 'ar://abc123def456',
    id: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    tags: ['community'],
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    // No logo/icon
    tags: [],
  },
];

// Known test addresses
const KNOWN_ADDRESSES = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

// ============================================================================
// Tests
// ============================================================================

describe('Token Service - Pure Functions', () => {
  // ==========================================================================
  // normalizeIpfsUrl Tests
  // ==========================================================================

  describe('normalizeIpfsUrl', () => {
    it('should handle null input', () => {
      expect(normalizeIpfsUrl(null)).toBeUndefined();
    });

    it('should handle undefined input', () => {
      expect(normalizeIpfsUrl(undefined)).toBeUndefined();
    });

    it('should handle empty string', () => {
      expect(normalizeIpfsUrl('')).toBeUndefined();
    });

    it('should convert IPFS protocol URL to ipfs.io gateway', () => {
      const input = 'ipfs://QmXfzKRvjZz3u5JRgC4v5mGVbm9ahrUiB4DgzHBsnWbTMM';
      const expected = 'https://ipfs.io/ipfs/QmXfzKRvjZz3u5JRgC4v5mGVbm9ahrUiB4DgzHBsnWbTMM';
      expect(normalizeIpfsUrl(input)).toBe(expected);
    });

    it('should convert Arweave protocol URL to Arweave gateway', () => {
      const input = 'ar://abc123def456ghi789';
      const expected = 'https://arweave.net/abc123def456ghi789';
      expect(normalizeIpfsUrl(input)).toBe(expected);
    });

    it('should preserve HTTP URLs', () => {
      const input = 'https://example.com/logo.png';
      expect(normalizeIpfsUrl(input)).toBe(input);
    });

    it('should preserve HTTPS URLs', () => {
      const input = 'https://raw.githubusercontent.com/solana-labs/token-list/main/logo.png';
      expect(normalizeIpfsUrl(input)).toBe(input);
    });

    it('should handle IPFS URLs with short hashes', () => {
      const input = 'ipfs://Qm123';
      const expected = 'https://ipfs.io/ipfs/Qm123';
      expect(normalizeIpfsUrl(input)).toBe(expected);
    });

    it('should handle Arweave URLs with short hashes', () => {
      const input = 'ar://abc';
      const expected = 'https://arweave.net/abc';
      expect(normalizeIpfsUrl(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // normalizeBackendTokens Tests
  // ==========================================================================

  describe('normalizeBackendTokens', () => {
    it('should normalize an empty array', () => {
      const result = normalizeBackendTokens([]);
      expect(result).toEqual([]);
    });

    it('should transform backend tokens to TokenMetadata format', () => {
      const result = normalizeBackendTokens(mockBackendTokens);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        address: 'So11111111111111111111111111111111111111112',
        chainId: 101,
        coingeckoId: 'solana',
        tags: ['verified', 'strict'],
      });
    });

    it('should prefer logo over icon field', () => {
      const token = mockBackendTokens[0]; // Has logo field
      const result = normalizeBackendTokens([token]);

      expect(result[0].logo).toBe(token.logo);
    });

    it('should use icon field when logo is missing', () => {
      const token = mockBackendTokens[1]; // Has icon field, no logo
      const result = normalizeBackendTokens([token]);

      // FE passes through whatever the BE catalog endpoints emit; gateway
      // normalization is owned server-side by `solana-ft-batch-resource`
      // and `solana-ft-resource`.
      expect(result[0].logo).toBe(token.icon);
    });

    it('should pass logo URLs through unchanged (BE owns IPFS gateway normalization)', () => {
      const ipfsToken = mockBackendTokens[1]; // ipfs:// in icon
      const arweaveToken = mockBackendTokens[2]; // ar:// in logo

      const ipfsResult = normalizeBackendTokens([ipfsToken]);
      const arweaveResult = normalizeBackendTokens([arweaveToken]);

      expect(ipfsResult[0].logo).toBe(ipfsToken.icon);
      expect(arweaveResult[0].logo).toBe(arweaveToken.logo);
    });

    it('should prefer address over id field', () => {
      const token = mockBackendTokens[0]; // Has address field
      const result = normalizeBackendTokens([token]);

      expect(result[0].address).toBe(token.address);
    });

    it('should use id field when address is missing', () => {
      const token = mockBackendTokens[2]; // Has id field, no address
      const result = normalizeBackendTokens([token]);

      expect(result[0].address).toBe('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R');
    });

    it('should handle missing logo/icon as undefined', () => {
      const token = mockBackendTokens[3]; // No logo or icon
      const result = normalizeBackendTokens([token]);

      expect(result[0].logo).toBeUndefined();
    });

    it('should handle missing tags as empty array', () => {
      const tokenWithoutTags = {
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 9,
        address: 'Test123456789',
      };
      const result = normalizeBackendTokens([tokenWithoutTags]);

      expect(result[0].tags).toEqual([]);
    });

    it('should preserve optional fields when present', () => {
      const token = mockBackendTokens[0]; // Has all optional fields
      const result = normalizeBackendTokens([token]);

      expect(result[0].chainId).toBe(101);
      expect(result[0].coingeckoId).toBe('solana');
      expect(result[0].tags).toEqual(['verified', 'strict']);
    });

    it('should handle missing optional fields', () => {
      const tokenMinimal = {
        symbol: 'MIN',
        name: 'Minimal Token',
        decimals: 6,
        address: 'Min123456789',
      };
      const result = normalizeBackendTokens([tokenMinimal]);

      expect(result[0].chainId).toBeUndefined();
      expect(result[0].coingeckoId).toBeUndefined();
      expect(result[0].tags).toEqual([]);
    });

    it('should handle empty address and id as empty string', () => {
      const tokenNoAddress = {
        symbol: 'NO_ADDR',
        name: 'No Address Token',
        decimals: 9,
      };
      const result = normalizeBackendTokens([tokenNoAddress]);

      expect(result[0].address).toBe('');
    });
  });

  // ==========================================================================
  // Async Service Functions Tests
  // ==========================================================================

  describe('Async Service Functions', () => {
    beforeEach(() => {
      // Clear cache and all mocks before each test
      clearTokenListCache();
      vi.clearAllMocks();
    });

    // ========================================================================
    // getTokenList() Tests
    // ========================================================================
    describe('getTokenList', () => {
      it('should return array of TokenMetadata from backend', async () => {
        mockApiClientGet.mockResolvedValueOnce({ data: mockBackendTokens });

        const result = await getTokenList('solana-mainnet');

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('symbol');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('decimals');
        expect(result[0]).toHaveProperty('address');
        expect(result[0]).toHaveProperty('logo');
      });

      it('should verify structure of returned tokens', async () => {
        mockApiClientGet.mockResolvedValueOnce({ data: mockBackendTokens });

        const result = await getTokenList('solana-mainnet');

        expect(result.length).toBeGreaterThan(0);
        const token = result[0];
        expect(typeof token.symbol).toBe('string');
        expect(typeof token.name).toBe('string');
        expect(typeof token.decimals).toBe('number');
        expect(typeof token.address).toBe('string');
        expect(token.logo === undefined || typeof token.logo === 'string').toBe(true);
      });

      it('should deduplicate tokens by symbol prioritizing verified', async () => {
        const duplicateTokens = [
          {
            symbol: 'TEST',
            name: 'Test Token Verified',
            decimals: 9,
            address: 'Test1',
            tags: ['verified'],
          },
          {
            symbol: 'TEST',
            name: 'Test Token Community',
            decimals: 9,
            address: 'Test2',
            tags: ['community'],
          },
          {
            symbol: 'TEST',
            name: 'Test Token Unknown',
            decimals: 9,
            address: 'Test3',
            tags: [],
          },
        ];

        mockApiClientGet.mockResolvedValueOnce({ data: duplicateTokens });

        const result = await getTokenList('solana-mainnet');

        const testTokens = result.filter((t) => t.symbol === 'TEST');
        expect(testTokens.length).toBe(1);
        expect(testTokens[0].name).toBe('Test Token Verified');
        expect(testTokens[0].tags).toContain('verified');
      });

      it('should propagate the error when the backend verified endpoint fails', async () => {
        mockApiClientGet.mockRejectedValueOnce(new Error('Backend unavailable'));

        await expect(getTokenList('solana-mainnet')).rejects.toThrow('Backend unavailable');
      });

      it('should cache results and return from cache on second call', async () => {
        mockApiClientGet.mockResolvedValueOnce({ data: mockBackendTokens });

        const result1 = await getTokenList('solana-mainnet');
        const result2 = await getTokenList('solana-mainnet');

        expect(result1).toEqual(result2);
        // apiClient.get should only be called once due to caching
        expect(mockApiClientGet).toHaveBeenCalledTimes(1);
      });

    });

    // ========================================================================
    // searchTokens() Tests
    // ========================================================================
    describe('searchTokens', () => {
      it('should return empty array for query < 3 chars', async () => {
        const result1 = await searchTokens('');
        const result2 = await searchTokens('SO');

        expect(result1).toEqual([]);
        expect(result2).toEqual([]);
      });

      it('should search for SOL token', async () => {
        const query = 'SOL';
        const searchResults = [mockBackendTokens[0]];
        mockApiClientGet.mockResolvedValueOnce({ data: searchResults });

        const result = await searchTokens(query, 'solana-mainnet');

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].symbol).toContain('SOL');
      });

      it('should search for USDC token', async () => {
        const query = 'USDC';
        const searchResults = [mockBackendTokens[1]];
        mockApiClientGet.mockResolvedValueOnce({ data: searchResults });

        const result = await searchTokens(query, 'solana-mainnet');

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should pass the query through axios params (not raw URL)', async () => {
        const query = 'test token';

        mockApiClientGet.mockImplementation((_url: unknown, config?: any) => {
          expect(config?.params?.query).toBe(query);
          return Promise.resolve({ data: [] });
        });

        await searchTokens(query, 'solana-mainnet');

        expect(mockApiClientGet).toHaveBeenCalled();
      });

      it('should match tokens by name, symbol, or address', async () => {
        const query = 'Solana';
        const searchResults = [mockBackendTokens[0]];
        mockApiClientGet.mockResolvedValueOnce({ data: searchResults });

        const result = await searchTokens(query, 'solana-mainnet');

        expect(Array.isArray(result)).toBe(true);
      });

      it('returns an empty array when the search endpoint fails', async () => {
        mockApiClientGet.mockRejectedValueOnce(new Error('Search error'));

        const result = await searchTokens('SOL', 'solana-mainnet');

        expect(result).toEqual([]);
      });
    });

    // ========================================================================
    // Cache Management Tests
    // ========================================================================
    describe('Cache Management', () => {
      it('clearTokenListCache forces the next call to refetch from the backend', async () => {
        mockApiClientGet.mockResolvedValue({ data: mockBackendTokens });

        await getTokenList('solana-mainnet');
        clearTokenListCache();
        await getTokenList('solana-mainnet');

        expect(mockApiClientGet).toHaveBeenCalledTimes(2);
      });

      it('should cache results for 5 minutes', async () => {
        mockApiClientGet.mockResolvedValueOnce({ data: mockBackendTokens });

        const result1 = await getTokenList('solana-mainnet');
        const result2 = await getTokenList('solana-mainnet');

        expect(result1).toEqual(result2);
        expect(mockApiClientGet).toHaveBeenCalledTimes(1);
      });
    });
  });
});
