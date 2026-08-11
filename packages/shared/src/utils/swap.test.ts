import { describe, expect, it } from 'vitest';

import type { TokenMetadata, UnifiedToken } from '../types/token';
import {
  getChainFromNetwork,
  getSwapMode,
  getSwapType,
  isSameChain,
  mapToSwapToken,
  toStealthExNetwork,
  unifiedToSwapToken,
  validateAddress,
} from './swap';

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

    it('selects Jupiter only for same-chain Solana swaps', () => {
      expect(getSwapType(SOL_TOKEN, { ...SOL_TOKEN, symbol: 'JUP' })).toBe('jupiter');
      expect(getSwapType(SOL_TOKEN, ETH_TOKEN)).toBe('stealthex');
    });

    it('returns null swap mode when a token or chain is missing', () => {
      expect(getSwapMode(null, { chain: 'solana' })).toBeNull();
      expect(getSwapMode({ chain: 'solana' }, null)).toBeNull();
      expect(getSwapMode({ chain: undefined }, { chain: 'solana' })).toBeNull();
    });

    it('resolves swap mode from nullable token shapes', () => {
      expect(getSwapMode({ chain: 'solana' }, { chain: 'solana' })).toBe('jupiter');
      expect(getSwapMode({ chain: 'bitcoin' }, { chain: 'ethereum' })).toBe('stealthex');
    });
  });

  describe('network normalization', () => {
    it('infers chain from symbol-first heuristics and known networks', () => {
      expect(getChainFromNetwork(null, 'BTC')).toBe('bitcoin');
      expect(getChainFromNetwork(undefined, 'ETHBASE')).toBe('ethereum');
      expect(getChainFromNetwork('solana-mainnet')).toBe('solana');
      expect(getChainFromNetwork('bitcoin-mainnet')).toBe('bitcoin');
      expect(getChainFromNetwork('base')).toBe('ethereum');
    });

    it('handles unsupported or missing network values consistently', () => {
      expect(getChainFromNetwork('bsc')).toBeNull();
      expect(getChainFromNetwork(undefined, 'DOGE')).toBeNull();
      expect(getChainFromNetwork(undefined, undefined)).toBe('solana');
    });

    it('maps wallet chains and network ids to StealthEx network codes', () => {
      expect(toStealthExNetwork('solana')).toBe('sol');
      expect(toStealthExNetwork('bitcoin-mainnet')).toBe('btc');
      expect(toStealthExNetwork('ethereum-mainnet')).toBe('eth');
      expect(toStealthExNetwork('base')).toBe('base');
      expect(toStealthExNetwork('unknown-chain')).toBeUndefined();
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

  describe('validateAddress', () => {
    it('returns neutral state for empty addresses', () => {
      expect(validateAddress('', 'solana')).toEqual({ valid: false, error: null });
    });

    it('validates Solana, Ethereum, and Bitcoin address formats', () => {
      expect(validateAddress('HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk', 'solana')).toEqual({
        valid: true,
        error: null,
      });
      expect(validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f35b32', 'ethereum')).toEqual({
        valid: true,
        error: null,
      });
      expect(validateAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'bitcoin')).toEqual({
        valid: true,
        error: null,
      });
    });

    it('returns chain-specific validation errors for malformed addresses', () => {
      expect(validateAddress('not-solana', 'solana')).toEqual({
        valid: false,
        error: 'swap.errors.invalidSolanaAddress',
      });
      expect(validateAddress('0x1234', 'ethereum')).toEqual({
        valid: false,
        error: 'swap.errors.invalidEthereumAddress',
      });
      expect(validateAddress('tb1qinvalid', 'bitcoin')).toEqual({
        valid: false,
        error: 'swap.errors.invalidBitcoinAddress',
      });
    });

    it('falls back to a generic length check for unknown chains', () => {
      expect(validateAddress('short', null)).toEqual({
        valid: false,
        error: 'swap.errors.addressTooShort',
      });
      expect(validateAddress('long-enough-address', null)).toEqual({
        valid: true,
        error: null,
      });
    });
  });
});
