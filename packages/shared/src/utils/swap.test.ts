import { describe, expect, it } from 'vitest';

import type { TokenMetadata, UnifiedToken } from '../types/token';
import { isSameChain, mapToSwapToken, unifiedToSwapToken } from './swap';

const SOL_TOKEN: UnifiedToken = {
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  logo: 'https://example.com/sol.png',
  balance: 3.5,
  usdPrice: 150,
  chain: 'solana',
  networkId: 'solana-mainnet',
};

const ETH_TOKEN: UnifiedToken = {
  address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  logo: 'https://example.com/eth.png',
  balance: 1.25,
  usdPrice: 3000,
  chain: 'ethereum',
  networkId: 'ethereum-mainnet',
};

const USDC_METADATA: TokenMetadata = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  logo: 'https://example.com/usdc.png',
};

describe('swap utils', () => {
  describe('chain helpers', () => {
    it('detects whether tokens belong to the same chain', () => {
      expect(isSameChain(SOL_TOKEN, { ...SOL_TOKEN, symbol: 'JUP' })).toBe(true);
      expect(isSameChain(SOL_TOKEN, ETH_TOKEN)).toBe(false);
    });
  });

  describe('token mapping', () => {
    it('maps token metadata to a Solana swap token with sensible defaults', () => {
      expect(mapToSwapToken(USDC_METADATA)).toEqual({
        ...USDC_METADATA,
        logo: USDC_METADATA.logo,
        balance: 0,
        usdPrice: undefined,
        chain: 'solana',
        networkId: 'solana-mainnet',
      });
    });

    it('keeps optional balance and pricing information when mapping metadata', () => {
      const result = mapToSwapToken(USDC_METADATA, 42, 0.999);

      expect(result.balance).toBe(42);
      expect(result.usdPrice).toBe(0.999);
    });

    it('preserves unified token chain and network information', () => {
      expect(unifiedToSwapToken(ETH_TOKEN)).toEqual({
        address: ETH_TOKEN.address,
        symbol: ETH_TOKEN.symbol,
        name: ETH_TOKEN.name,
        decimals: ETH_TOKEN.decimals,
        logo: ETH_TOKEN.logo,
        balance: ETH_TOKEN.balance,
        usdPrice: ETH_TOKEN.usdPrice,
        chain: 'ethereum',
        networkId: 'ethereum-mainnet',
      });
    });
  });
});
