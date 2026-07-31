/**
 * Canonical blockchain types shared across the wallet.
 *
 * This file is the single source of truth for blockchain-level type
 * definitions (chain identifiers, account unions, network unions).
 * All hook and service files should import from here rather than
 * defining their own copies.
 *
 * @module types/blockchain
 */

import type { SolanaAccount } from '../blockchain/solana';
import type { BitcoinAccount } from '../blockchain/bitcoin';
import type { EthereumAccount } from '../blockchain/ethereum';
import type { NetworkCapabilities } from './settings';

/**
 * Supported blockchain identifiers.
 *
 * Previously duplicated as `BlockchainType` (useAddressValidation, useAddressbook,
 * useBalance, useTransactions), `ChainType` (useMultiChainTokens),
 * `SendBlockchainType` (useSendTransaction), and `SwapChainType` (types/swap).
 */
export type BlockchainType = 'solana' | 'bitcoin' | 'ethereum';

/**
 * Unified blockchain account type that can represent accounts from any
 * supported blockchain.
 *
 * Previously duplicated in useAccounts and useBalance.
 */
export type BlockchainAccount = SolanaAccount | BitcoinAccount | EthereumAccount;

/**
 * Union type for all supported network configurations.
 *
 * Previously duplicated in useAccounts (local) and useAvailableNetworks.
 */
export type AnyNetwork = SolanaNetwork | BitcoinNetwork | EthereumNetwork;

/**
 * Networks grouped by blockchain.
 *
 * Previously defined in useAvailableNetworks.
 */
export interface NetworksByBlockchain {
  /** Available Solana networks */
  solana: SolanaNetwork[];
  /** Available Bitcoin networks */
  bitcoin: BitcoinNetwork[];
  /** Available Ethereum networks */
  ethereum: EthereumNetwork[];
}

// ============================================================================
// Per-chain network IDs
// ============================================================================

/**
 * Solana network identifier.
 *
 * Previously defined in api/services/solana.ts and duplicated as local
 * `NetworkId` in api/services/tokens.ts, nft-burn.ts, and price.ts.
 */
export type SolanaNetworkId = 'solana-mainnet' | 'solana-devnet';

/**
 * Bitcoin network identifier.
 *
 * Previously defined in api/services/bitcoin.ts.
 */
export type BitcoinNetworkId = 'bitcoin-mainnet' | 'bitcoin-testnet';

/**
 * Ethereum network identifier.
 *
 * Ethereum account network identifier.
 */
export type EthereumNetworkId = 'ethereum-mainnet' | 'ethereum-sepolia';

// ============================================================================
// Unified network ID
// ============================================================================

/**
 * Network ID for balance / transaction queries.
 *
 * Previously defined in useBalance as `NetworkId`.
 */
export type NetworkId = SolanaNetworkId | BitcoinNetworkId | EthereumNetworkId;

// ============================================================================
// Per-chain network configs and definitions
// ============================================================================

/**
 * Network configuration for Solana connections
 */
export interface SolanaNetworkConfig {
  /** RPC endpoint URL */
  nodeUrl: string;
  /** WebSocket endpoint URL (optional) */
  wsUrl?: string;
  /** Network commitment level */
  commitment?: import('@solana/kit').Commitment;
}

/**
 * Network definition for Solana
 */
export interface SolanaNetwork {
  /** Network identifier */
  id: SolanaNetworkId;
  /** Human-readable network name */
  name: string;
  /** Network ID for environment identification */
  networkId: SolanaNetworkId;
  /** Network configuration */
  config: SolanaNetworkConfig;
}

/**
 * Network configuration for Bitcoin connections
 */
export interface BitcoinNetworkConfig {
  /** API endpoint URL for balance and transaction queries */
  apiUrl?: string;
  /** bitcoinjs-lib network configuration */
  network: import('bitcoinjs-lib').Network;
}

/**
 * Network definition for Bitcoin
 */
export interface BitcoinNetwork {
  /** Network identifier */
  id: BitcoinNetworkId;
  /** Human-readable network name */
  name: string;
  /** Network ID for environment identification */
  networkId: BitcoinNetworkId;
  /**
   * @deprecated Use `networkId` instead. Will be removed in a future version.
   */
  environment?: BitcoinEnvironment;
  /** Network configuration */
  config: BitcoinNetworkConfig;
}

/**
 * @deprecated Use `BitcoinNetworkId` from `types/blockchain` instead.
 */
export type BitcoinEnvironment = 'mainnet' | 'testnet';

/**
 * Network configuration for Ethereum connections
 */
export interface EthereumNetworkConfig {
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Chain ID */
  chainId: number;
}

/**
 * Network definition for Ethereum
 */
export interface EthereumNetwork {
  /** Network identifier */
  id: EthereumNetworkId;
  /** Human-readable network name */
  name: string;
  /** Network ID for environment identification */
  networkId: EthereumNetworkId;
  /**
   * @deprecated Use `networkId` instead. Will be removed in a future version.
   */
  environment?: EthereumEnvironment;
  /** Network configuration */
  config: EthereumNetworkConfig;
}

/**
 * @deprecated Use `EthereumNetworkId` from `types/blockchain` instead.
 */
export type EthereumEnvironment = 'mainnet' | 'sepolia';

// ============================================================================
// API network data
// ============================================================================

/**
 * Network information from the backend API (/v1/networks).
 *
 * Previously defined in api/client.ts.
 */
export interface NetworkCatalogBase {
  id: string;
  name: string;
  blockchain: BlockchainType;
  icon?: string;
  currency?: {
    symbol: string;
    decimals: number;
  };
  enabled: boolean;
  sections: NetworkCapabilities['sections'];
}

export interface SolanaNetworkCatalogEntry extends NetworkCatalogBase {
  id: SolanaNetworkId;
  blockchain: 'solana';
  environment: 'mainnet' | 'devnet';
  config: SolanaNetworkConfig;
}

export interface BitcoinNetworkCatalogEntry extends NetworkCatalogBase {
  id: BitcoinNetworkId;
  blockchain: 'bitcoin';
  environment: BitcoinEnvironment;
  config: {
    apiUrl?: string;
  };
}

export interface EthereumNetworkCatalogEntry extends NetworkCatalogBase {
  id: EthereumNetworkId;
  blockchain: 'ethereum';
  environment: EthereumEnvironment;
  config: EthereumNetworkConfig;
}

export type NetworkCatalogEntry =
  | SolanaNetworkCatalogEntry
  | BitcoinNetworkCatalogEntry
  | EthereumNetworkCatalogEntry;

/**
 * @deprecated Use `NetworkCatalogEntry` instead.
 */
export interface Network extends NetworkCatalogBase {
  environment: string;
  config: Record<string, unknown>;
  [key: string]: unknown;
}
