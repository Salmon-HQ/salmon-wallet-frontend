/**
 * Token-related domain types (not UI component props).
 *
 * @module types/token
 */

import type { BlockchainType } from './blockchain';

// ============================================================================
// Token metadata (from API / token lists)
// ============================================================================

/**
 * Token metadata from the API / token lists.
 *
 * Previously defined in api/services/tokens.ts.
 */
export interface TokenMetadata {
  /** Token symbol (e.g., 'SOL', 'USDC') */
  symbol: string;
  /** Token name */
  name: string;
  /** Token decimals */
  decimals: number;
  /** Token logo URL */
  logo?: string;
  /** Token address (mint address for Solana) */
  address: string;
  /** Chain ID (e.g., 101 for Solana mainnet) */
  chainId?: number;
  /** CoinGecko ID for price lookups */
  coingeckoId?: string;
  /** Token tags for categorization */
  tags?: string[];
  /**
   * Whether the swap router can trade it. `false` only for Token-2022 mints
   * with a transfer fee or hook; such a token still sends and receives, it
   * is only left out of the swap picker.
   */
  swappable?: boolean;
}

/**
 * Token list item (same as metadata for compatibility).
 *
 * Previously defined in api/services/tokens.ts.
 */
export type TokenListItem = TokenMetadata;

// ============================================================================
// Custom token metadata (without address as key)
// ============================================================================

/**
 * Custom token metadata (without address as key).
 * Previously defined in useAccounts.
 */
export interface TokenInfo {
  /** Token symbol */
  symbol?: string;
  /** Token name */
  name?: string;
  /** Token decimals */
  decimals?: number;
  /** Logo URI */
  logoURI?: string;
}

/**
 * Custom tokens indexed by address, grouped by network.
 * Previously defined in useAccounts.
 */
export type CustomTokens = Record<string, Record<string, TokenInfo>>;

/**
 * Token to import with address.
 * Previously defined in useAccounts.
 */
export interface TokenToImport extends TokenInfo {
  /** Token mint address */
  address: string;
}

// ============================================================================
// Unified multi-chain token
// ============================================================================

/**
 * Unified token format that works across all chains.
 * Previously defined in useMultiChainTokens.
 */
export interface UnifiedToken {
  /** Token symbol (e.g., "SOL", "BTC", "ETH", "USDC") */
  symbol: string;
  /** Token name */
  name: string;
  /** Token address/mint (or symbol for native tokens) */
  address: string;
  /** Token decimals */
  decimals: number;
  /** Token logo URL */
  logo?: string;
  /** User's balance of this token */
  balance: number;
  /** USD price per token */
  usdPrice?: number;
  /** USD value of balance */
  usdBalance?: number;
  /** Chain this token belongs to */
  chain: BlockchainType;
  /** Network ID (e.g., 'solana-mainnet', 'bitcoin-mainnet', 'ethereum-mainnet') */
  networkId: string;
}

// ============================================================================
// Ethereum ERC-20 token types (moved from blockchain/ethereum/tokens.ts)
// ============================================================================

/**
 * Represents an ERC-20 token with its metadata.
 *
 * Previously defined in blockchain/ethereum/tokens.ts.
 */
export interface EthereumToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
  coingeckoId?: string;
}

/**
 * Represents a token with its balance.
 *
 * Previously defined in blockchain/ethereum/tokens.ts.
 */
export interface EthereumTokenBalance extends EthereumToken {
  balance: bigint;
  uiAmount: string;
}

/**
 * Result of automatic token detection.
 *
 * Previously defined in blockchain/ethereum/tokens.ts.
 */
export interface TokenDetectionResult {
  /** Tokens detected via API indexing (all tokens user holds) */
  detectedTokens: EthereumTokenBalance[];
  /** Tokens from featured list with balances fetched via RPC */
  featuredTokens: EthereumTokenBalance[];
  /** Combined and deduplicated list of all tokens with non-zero balance */
  allTokens: EthereumTokenBalance[];
  /** Whether automatic detection was used (vs. RPC-only fallback) */
  usedAutomaticDetection: boolean;
}

// ============================================================================
// Ethereum ERC-20 types (moved from api/services/ethereum.ts)
// ============================================================================

/**
 * Token balance from Alchemy API
 */
export interface AlchemyTokenBalance {
  /** Token contract address */
  contractAddress: string;
  /** Raw balance in hex */
  tokenBalance: string;
}

/**
 * Token metadata from Alchemy API
 */
export interface AlchemyTokenMetadata {
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Number of decimals */
  decimals: number;
  /** Logo URL */
  logo: string | null;
}

/**
 * Detected ERC-20 token with balance and metadata
 */
export interface DetectedERC20Token {
  /** Token contract address */
  address: string;
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Raw balance as string (in smallest unit) */
  balance: string;
  /** Human-readable balance */
  uiAmount: number;
  /** Logo URL if available */
  logoUri?: string;
  /** CoinGecko ID for price lookups */
  coingeckoId?: string;
}
