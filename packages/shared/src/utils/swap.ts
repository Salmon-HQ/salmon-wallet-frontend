/**
 * Swap utility functions.
 *
 * Extracted from useMultiChainTokens.ts.
 *
 * @module utils/swap
 */

import type { TokenMetadata, UnifiedToken } from '../types/token';
import type { SwapToken, SwapChainType } from '../types/swap';

/**
 * Determines if two tokens are on the same chain.
 */
export function isSameChain(tokenA: UnifiedToken, tokenB: UnifiedToken): boolean {
  return tokenA.chain === tokenB.chain;
}

/**
 * Converts a TokenMetadata to a SwapToken.
 * Defaults to solana-mainnet since search results are Solana tokens.
 */
export function mapToSwapToken(
  token: TokenMetadata,
  balance?: number,
  usdPrice?: number
): SwapToken {
  return {
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    logo: token.logo || undefined,
    balance: balance || 0,
    usdPrice: usdPrice,
    chain: 'solana',
    networkId: 'solana-mainnet',
  };
}

/**
 * Converts a UnifiedToken to a SwapToken.
 */
export function unifiedToSwapToken(token: UnifiedToken): SwapToken {
  return {
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    logo: token.logo,
    balance: token.balance,
    usdPrice: token.usdPrice,
    chain: token.chain as SwapChainType,
    networkId: token.networkId,
  };
}
