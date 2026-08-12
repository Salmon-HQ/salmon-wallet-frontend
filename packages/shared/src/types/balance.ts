/**
 * Balance-related domain types for all supported blockchains.
 *
 * Pure data types with no library dependencies.
 * Previously defined inline in blockchain/ account files.
 *
 * @module types/balance
 */

import type { BitcoinBalanceItem, SolanaBalanceItem, EthereumBalanceItem } from './transfer';

// ============================================================================
// Chain-specific native account balances
// ============================================================================

/**
 * Simple balance information for a Bitcoin account (satoshis and BTC).
 *
 * Previously defined in blockchain/bitcoin/BitcoinAccount.ts.
 */
export interface BitcoinAccountBalance {
  /** Balance in satoshis */
  satoshis: bigint;
  /** Balance in BTC */
  btc: number;
}

/**
 * Wallet balance response with totals for Bitcoin.
 *
 * Previously defined in blockchain/bitcoin/BitcoinAccount.ts.
 */
export interface BitcoinWalletBalance {
  /** Total USD value */
  usdTotal?: number;
  /** 24h change in USD */
  last24HoursChange?: number;
  /** Balance items */
  items: BitcoinBalanceItem[];
}

/**
 * Wallet balance response with totals for Solana.
 *
 * Mirrors BitcoinWalletBalance shape for uniform hook consumption.
 */
export interface SolanaWalletBalance {
  /** Total USD value */
  usdTotal?: number;
  /** 24h change in USD */
  last24HoursChange?: number;
  /** Balance items */
  items: SolanaBalanceItem[];
}

/**
 * Wallet balance response with totals for Ethereum.
 *
 * Mirrors BitcoinWalletBalance shape for uniform hook consumption.
 */
export interface EthereumWalletBalance {
  /** Total USD value */
  usdTotal?: number;
  /** 24h change in USD */
  last24HoursChange?: number;
  /** Balance items */
  items: EthereumBalanceItem[];
}

/**
 * Balance information for an Ethereum account.
 *
 * Previously defined as `EthereumBalance` in blockchain/ethereum/EthereumAccount.ts.
 */
export interface EthereumAccountBalance {
  /** Balance in wei */
  wei: bigint;
  /** Balance in ETH */
  eth: number;
}

/**
 * Balance information for a Solana account.
 *
 * Previously defined as `SolanaBalance` in blockchain/solana/SolanaAccount.ts.
 */
export interface SolanaAccountBalance {
  /** Balance in lamports */
  lamports: bigint;
  /** Balance in SOL */
  sol: number;
}

/**
 * Union of all chain-specific native account balances.
 */
export type NativeAccountBalance =
  BitcoinAccountBalance | EthereumAccountBalance | SolanaAccountBalance;

// ============================================================================
// Ethereum on-chain balance types (from ethereum/balance.ts)
// ============================================================================

/**
 * Balance information for ETH or ERC20 token (on-chain).
 *
 * Renamed from `EthereumTokenBalance` in blockchain/ethereum/balance.ts
 * to avoid conflict with `EthereumTokenBalance` in ethereum/tokens.ts.
 */
export interface EthereumOnChainTokenBalance {
  /** Token contract address (empty string for native ETH) */
  address: string;
  /** Token symbol (e.g., 'ETH', 'USDC') */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Raw balance in smallest unit (wei for ETH) */
  balance: bigint;
  /** Human-readable formatted balance */
  formattedBalance: string;
}

/**
 * Complete on-chain wallet balance with native ETH and tokens.
 *
 * Previously defined in blockchain/ethereum/balance.ts.
 * Renamed from EthereumWalletBalance to avoid conflict with the
 * items-based EthereumWalletBalance used by EthereumAccount.getBalance().
 */
export interface EthereumOnChainWalletBalance {
  /** Native ETH balance */
  native: EthereumOnChainTokenBalance;
  /** ERC20 token balances */
  tokens: EthereumOnChainTokenBalance[];
  /** Total USD value (would need price service integration) */
  totalUsd?: number;
}

/**
 * Token information for balance lookup.
 *
 * Renamed from `TokenInfo` in blockchain/ethereum/balance.ts
 * to avoid conflict with `TokenInfo` in types/token.ts.
 */
export interface BalanceLookupToken {
  /** Token contract address */
  address: string;
  /** Token symbol */
  symbol?: string;
  /** Token decimals (fetched from contract if not provided) */
  decimals?: number;
}

/**
 * Result from getEthereumTokenBalance including raw and token info.
 *
 * Previously defined in blockchain/ethereum/balance.ts.
 */
export interface EthereumTokenBalanceResult extends EthereumOnChainTokenBalance {
  /** Whether the balance fetch was successful */
  success: boolean;
  /** Error message if fetch failed */
  error?: string;
}
