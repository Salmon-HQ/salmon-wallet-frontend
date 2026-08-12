/**
 * Ethereum Service Tests
 * Tests for ERC-20 token detection and metadata functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getERC20TokenBalances, getTokenMetadataBatch, type DetectedERC20Token } from './ethereum';
import {
  hexToBalance,
  formatERC20TokenBalance as formatTokenBalance,
  mergeTokenLists,
} from '../../utils/tokens';
import * as clientModule from '../client';

// ============================================================================
// Test Data
// ============================================================================

const MOCK_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const MOCK_NETWORK_ID = 'ethereum-mainnet';

const MOCK_SALMON_API_RESPONSE = [
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    amount: '1000000000', // 1000 USDC
    logoURI: 'https://example.com/usdc.png',
    coingeckoId: 'usd-coin',
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    amount: '500000000', // 500 USDT
    logoURI: 'https://example.com/usdt.png',
    coingeckoId: 'tether',
  },
];

const MOCK_ETHPLORER_RESPONSE = {
  address: MOCK_WALLET_ADDRESS,
  ETH: {
    balance: 1.5,
    rawBalance: '1500000000000000000',
  },
  tokens: [
    {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      balance: 2.0,
      rawBalance: '2000000000000000000',
      image: '/token/weth.png',
    },
    {
      address: '0x6B175474E89094C44Da98b954EedeC16991e0F68',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
      balance: 100.0,
      rawBalance: '100000000000000000000',
      image: '/token/dai.png',
    },
  ],
};

const MOCK_FEATURED_TOKENS = [
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUri: 'https://featured.com/usdc.png',
    coingeckoId: 'usd-coin',
  },
  {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    logoUri: 'https://featured.com/uni.png',
    coingeckoId: 'uniswap',
  },
];

// ============================================================================
// getERC20TokenBalances Tests
// ============================================================================

describe('getERC20TokenBalances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Note: GET /v1/<networkId>/account/<address>/tokens is forward-compat
  // for the Ethereum slice. The salmon-api backend does NOT yet expose
  // this endpoint — getSalmonApiTokenBalances falls back to Ethplorer in
  // production. The mock-based cases below cover the FE mapping logic
  // for the day the BE ships the route.
  it('should fetch tokens from Salmon API successfully', async () => {
    // Mock successful Salmon API response
    vi.spyOn(clientModule, 'get').mockResolvedValue(MOCK_SALMON_API_RESPONSE);

    const result = await getERC20TokenBalances(MOCK_WALLET_ADDRESS, MOCK_NETWORK_ID);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      balance: '1000000000',
      uiAmount: 1000,
      logoUri: 'https://example.com/usdc.png',
      coingeckoId: 'usd-coin',
    });
    expect(result[1]).toMatchObject({
      symbol: 'USDT',
      uiAmount: 500,
    });
  });

  it('should fallback to Ethplorer when Salmon API returns empty', async () => {
    // Mock Salmon API returning empty array
    vi.spyOn(clientModule, 'get').mockResolvedValue([]);

    // Mock successful Ethplorer fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ETHPLORER_RESPONSE,
    } as Response);

    const result = await getERC20TokenBalances(MOCK_WALLET_ADDRESS, MOCK_NETWORK_ID);

    expect(result).toHaveLength(2); // WETH and DAI
    expect(result[0]).toMatchObject({
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      uiAmount: 2.0,
    });
    expect(result[1]).toMatchObject({
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      uiAmount: 100.0,
    });

    // Verify logoUri is prefixed with ethplorer domain
    expect(result[0].logoUri).toBe('https://ethplorer.io/token/weth.png');
  });

  it('should fallback to Ethplorer when Salmon API throws error', async () => {
    // Mock Salmon API throwing error
    vi.spyOn(clientModule, 'get').mockRejectedValue(new Error('API not available'));

    // Mock successful Ethplorer fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_ETHPLORER_RESPONSE,
    } as Response);

    const result = await getERC20TokenBalances(MOCK_WALLET_ADDRESS, MOCK_NETWORK_ID);

    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe('WETH');
  });

  it('should return empty array for non-mainnet when Salmon API fails', async () => {
    // Mock Salmon API error
    vi.spyOn(clientModule, 'get').mockRejectedValue(new Error('API not available'));

    const result = await getERC20TokenBalances(MOCK_WALLET_ADDRESS, 'ethereum-sepolia');

    // Should not fallback to Ethplorer for testnets
    expect(result).toEqual([]);
  });

  it('should filter out tokens with zero balance', async () => {
    const responseWithZeroBalance = [
      ...MOCK_SALMON_API_RESPONSE,
      {
        address: '0x0000000000000000000000000000000000000000',
        name: 'Zero Token',
        symbol: 'ZERO',
        decimals: 18,
        amount: '0',
        logoURI: 'https://example.com/zero.png',
      },
    ];

    vi.spyOn(clientModule, 'get').mockResolvedValue(responseWithZeroBalance);

    const result = await getERC20TokenBalances(MOCK_WALLET_ADDRESS, MOCK_NETWORK_ID);

    // Should only include non-zero balances
    expect(result).toHaveLength(2);
    expect(result.every((token) => token.uiAmount > 0)).toBe(true);
  });

  it('should handle Ethplorer API errors gracefully', async () => {
    // Mock Salmon API returning empty
    vi.spyOn(clientModule, 'get').mockResolvedValue([]);

    // Mock Ethplorer fetch error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await getERC20TokenBalances(MOCK_WALLET_ADDRESS, MOCK_NETWORK_ID);

    // Should return empty array on Ethplorer error
    expect(result).toEqual([]);
  });

  it('should calculate uiAmount correctly for various decimals', async () => {
    const tokensWithVariousDecimals = [
      {
        address: '0x1111111111111111111111111111111111111111',
        name: 'Token 6 Decimals',
        symbol: 'T6D',
        decimals: 6,
        amount: '1234567890', // 1234.56789 with 6 decimals
      },
      {
        address: '0x2222222222222222222222222222222222222222',
        name: 'Token 18 Decimals',
        symbol: 'T18D',
        decimals: 18,
        amount: '1234567890000000000000', // 1234.56789 with 18 decimals
      },
    ];

    vi.spyOn(clientModule, 'get').mockResolvedValue(tokensWithVariousDecimals);

    const result = await getERC20TokenBalances(MOCK_WALLET_ADDRESS, MOCK_NETWORK_ID);

    expect(result[0].uiAmount).toBeCloseTo(1234.56789, 5);
    expect(result[1].uiAmount).toBeCloseTo(1234.56789, 5);
  });

  it('should lookup coingeckoId from known tokens', async () => {
    const knownTokenResponse = [
      {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC (lowercase)
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        amount: '1000000',
        // No coingeckoId in response
      },
    ];

    vi.spyOn(clientModule, 'get').mockResolvedValue(knownTokenResponse);

    const result = await getERC20TokenBalances(MOCK_WALLET_ADDRESS, MOCK_NETWORK_ID);

    // Should have coingeckoId from internal lookup
    expect(result[0].coingeckoId).toBe('usd-coin');
  });

  it('should handle Ethplorer response with string decimals', async () => {
    vi.spyOn(clientModule, 'get').mockResolvedValue([]);

    const ethplorerWithStringDecimals = {
      ...MOCK_ETHPLORER_RESPONSE,
      tokens: [
        {
          address: '0x1234',
          name: 'Test Token',
          symbol: 'TEST',
          decimals: '18', // String instead of number
          balance: 100,
          rawBalance: '100000000000000000000',
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ethplorerWithStringDecimals,
    } as Response);
    global.fetch = fetchMock;

    const result = await getERC20TokenBalances(MOCK_WALLET_ADDRESS, MOCK_NETWORK_ID);

    expect(result[0].decimals).toBe(18); // Should be converted to number
  });
});

// ============================================================================
// getTokenMetadataBatch Tests
// ============================================================================

describe('getTokenMetadataBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Note: GET /v1/<networkId>/tokens/metadata is forward-compat for the
  // Ethereum slice. The salmon-api backend does not yet expose this
  // endpoint — getTokenMetadataBatch swallows the rejection and tokens
  // fall back to on-chain metadata in production.
  it('should fetch metadata for multiple tokens', async () => {
    const mockMetadataResponse = [
      {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logo: 'https://example.com/usdc.png',
      },
      {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        logo: 'https://example.com/usdt.png',
      },
    ];

    vi.spyOn(clientModule, 'get').mockResolvedValue(mockMetadataResponse);

    const addresses = [
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    ];

    const result = await getTokenMetadataBatch(addresses, MOCK_NETWORK_ID);

    expect(result.size).toBe(2);
    expect(result.get('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')).toMatchObject({
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      logo: 'https://example.com/usdc.png',
    });
  });

  it('should return empty map for empty addresses array', async () => {
    const result = await getTokenMetadataBatch([]);

    expect(result.size).toBe(0);
  });

  it('should return empty map when API fails', async () => {
    vi.spyOn(clientModule, 'get').mockRejectedValue(new Error('API error'));

    const result = await getTokenMetadataBatch(['0x1234'], MOCK_NETWORK_ID);

    expect(result.size).toBe(0);
  });

  it('should normalize addresses to lowercase in map', async () => {
    const mockResponse = [
      {
        address: '0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48', // Mixed case
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logo: undefined,
      },
    ];

    vi.spyOn(clientModule, 'get').mockResolvedValue(mockResponse);

    const result = await getTokenMetadataBatch(['0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48']);

    // Should be stored as lowercase
    expect(result.has('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')).toBe(true);
  });
});

// ============================================================================
// hexToBalance Tests
// ============================================================================

describe('hexToBalance', () => {
  it('should convert hex string to bigint', () => {
    expect(hexToBalance('0x64')).toBe(100n);
    expect(hexToBalance('0x3e8')).toBe(1000n);
    expect(hexToBalance('0xde0b6b3a7640000')).toBe(1000000000000000000n); // 1 ETH in wei
  });

  it('should handle zero values', () => {
    expect(hexToBalance('0x0')).toBe(0n);
    expect(hexToBalance('0x')).toBe(0n);
    expect(hexToBalance('')).toBe(0n);
  });

  it('should handle very large values', () => {
    const largeHex = '0x1000000000000000000'; // Very large value
    const result = hexToBalance(largeHex);
    expect(typeof result).toBe('bigint');
    expect(result > 0n).toBe(true);
  });
});

// ============================================================================
// formatTokenBalance Tests
// ============================================================================

describe('formatTokenBalance', () => {
  it('should format balance with correct decimals', () => {
    // 1000 USDC (6 decimals) - will be formatted as 1.00K
    expect(formatTokenBalance(1000000000n, 6)).toBe('1.00K');

    // 1 ETH (18 decimals)
    expect(formatTokenBalance(1000000000000000000n, 18)).toBe('1.0000');

    // 0.5 USDC
    expect(formatTokenBalance(500000n, 6)).toBe('0.5000');

    // 100 USDC (below K threshold)
    expect(formatTokenBalance(100000000n, 6)).toBe('100.0000');
  });

  it('should format zero balance', () => {
    expect(formatTokenBalance(0n, 18)).toBe('0');
    expect(formatTokenBalance('0', 6)).toBe('0');
  });

  it('should format very small amounts', () => {
    // formatTokenBalance shows 0 for extremely small amounts
    expect(formatTokenBalance(1n, 18)).toBe('0'); // 0.000000000000000001 ETH - extremely small

    // 100n with 6 decimals = 0.0001, which is at the threshold and shown
    expect(formatTokenBalance(100n, 6)).toBe('0.0001'); // 0.0001 USDC

    // Even smaller amounts return 0
    expect(formatTokenBalance(10n, 6)).toBe('0'); // 0.00001 USDC - too small
  });

  it('should format large amounts with K suffix', () => {
    // 10,000 USDC
    expect(formatTokenBalance(10000000000n, 6)).toBe('10.00K');

    // 50,000 tokens
    expect(formatTokenBalance(50000000000n, 6)).toBe('50.00K');
  });

  it('should format very large amounts with M suffix', () => {
    // 1,000,000 USDC
    expect(formatTokenBalance(1000000000000n, 6)).toBe('1.00M');

    // 5,000,000 tokens
    expect(formatTokenBalance(5000000000000n, 6)).toBe('5.00M');
  });

  it('should accept string balance input', () => {
    expect(formatTokenBalance('1000000000', 6)).toBe('1.00K');
    expect(formatTokenBalance('1000000000000000000', 18)).toBe('1.0000');
  });

  it('should respect custom display decimals for amounts < 1000', () => {
    const balance = 123456789n; // 123.456789 with 6 decimals (< 1000, no K suffix)

    expect(formatTokenBalance(balance, 6, 2)).toBe('123.45');
    expect(formatTokenBalance(balance, 6, 4)).toBe('123.4567');
    expect(formatTokenBalance(balance, 6, 6)).toBe('123.456789');
  });
});

// ============================================================================
// mergeTokenLists Tests
// ============================================================================

describe('mergeTokenLists', () => {
  it('should merge detected and featured tokens', () => {
    const detectedTokens: DetectedERC20Token[] = [
      {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        balance: '1000000000',
        uiAmount: 1000,
        logoUri: 'https://detected.com/usdc.png',
        coingeckoId: 'usd-coin',
      },
    ];

    const result = mergeTokenLists(detectedTokens, MOCK_FEATURED_TOKENS);

    // Should have 2 tokens: USDC (detected) + UNI (featured)
    // But only USDC has balance > 0
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('USDC');

    // Should prefer detected token data over featured
    expect(result[0].logoUri).toBe('https://detected.com/usdc.png');
  });

  it('should deduplicate by address (case-insensitive)', () => {
    const detectedTokens: DetectedERC20Token[] = [
      {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // lowercase
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        balance: '1000000000',
        uiAmount: 1000,
      },
    ];

    const featuredWithSameAddress = [
      {
        address: '0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48', // uppercase
        symbol: 'USDC',
        name: 'USD Coin Featured',
        decimals: 6,
        logoUri: 'https://featured.com/usdc.png',
      },
    ];

    const result = mergeTokenLists(detectedTokens, featuredWithSameAddress);

    // Should only have one USDC token
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('USD Coin'); // Detected token data wins
  });

  it('should filter out zero balance tokens', () => {
    const detectedWithZero: DetectedERC20Token[] = [
      {
        address: '0x1111',
        name: 'Token 1',
        symbol: 'TKN1',
        decimals: 18,
        balance: '1000000000000000000',
        uiAmount: 1.0,
      },
      {
        address: '0x2222',
        name: 'Token 2',
        symbol: 'TKN2',
        decimals: 18,
        balance: '0',
        uiAmount: 0,
      },
    ];

    const result = mergeTokenLists(detectedWithZero, []);

    // Should only include token with balance > 0
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('TKN1');
  });

  it('should handle empty detected tokens', () => {
    const result = mergeTokenLists([], MOCK_FEATURED_TOKENS);

    // Featured tokens with zero balance should not be included
    expect(result).toHaveLength(0);
  });

  it('should handle empty featured tokens', () => {
    const detectedTokens: DetectedERC20Token[] = [
      {
        address: '0x1111',
        name: 'Token 1',
        symbol: 'TKN1',
        decimals: 18,
        balance: '100',
        uiAmount: 0.0000001,
      },
    ];

    const result = mergeTokenLists(detectedTokens, []);

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('TKN1');
  });
});
