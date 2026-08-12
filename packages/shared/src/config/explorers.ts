/**
 * Blockchain explorer configuration.
 *
 * This module provides explorer URL templates for different blockchains and networks.
 * Each explorer has a URL template with `{txId}` placeholder for transaction IDs.
 *
 * @module config/explorers
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Supported blockchain types for explorers.
 */
export type Blockchain = 'SOLANA' | 'BITCOIN' | 'ETHEREUM';

/**
 * Supported network environments.
 */
export type NetworkEnvironment =
  'mainnet' | 'solana-mainnet' | 'testnet' | 'solana-devnet' | 'sepolia';

/**
 * Explorer configuration with name and URL template.
 */
export interface Explorer {
  /** Display name for the explorer */
  name: string;
  /** URL template with {txId} placeholder */
  url: string;
}

/**
 * Explorer with its key identifier.
 */
export interface ExplorerWithKey extends Explorer {
  /** Unique key identifier for this explorer */
  key: string;
}

/**
 * Map of explorer keys to explorer configurations for a specific network.
 */
export type NetworkExplorers = Record<string, Explorer>;

/**
 * Map of network environments to their available explorers.
 */
export type BlockchainExplorers = Partial<Record<NetworkEnvironment, NetworkExplorers>>;

/**
 * Complete explorers configuration for all blockchains.
 */
export type ExplorersConfig = Record<Blockchain, BlockchainExplorers>;

/**
 * Default explorer selection for each blockchain.
 */
export type DefaultExplorers = Record<Blockchain, string>;

// ============================================================================
// Solana Explorers
// ============================================================================

const SOLANA_EXPLORERS: NetworkExplorers = {
  SOLSCAN: {
    name: 'Solscan',
    url: 'https://solscan.io/tx/{txId}',
  },
  SOLANA_FM: {
    name: 'Solana FM',
    url: 'https://solana.fm/tx/{txId}',
  },
  SOLANA_EXPLORER: {
    name: 'Solana Explorer',
    url: 'https://explorer.solana.com/tx/{txId}',
  },
  SOLANA_BEACH: {
    name: 'Solana Beach',
    url: 'https://solanabeach.io/transaction/{txId}',
  },
};

// ============================================================================
// Bitcoin Explorers
// ============================================================================

const BITCOIN_MAINNET_EXPLORERS: NetworkExplorers = {
  BLOCKCYPHER: {
    name: 'Blockcypher',
    url: 'https://live.blockcypher.com/btc/tx/{txId}',
  },
};

const BITCOIN_TESTNET_EXPLORERS: NetworkExplorers = {
  BLOCKCYPHER: {
    name: 'Blockcypher',
    url: 'https://live.blockcypher.com/btc-testnet/tx/{txId}',
  },
};

// ============================================================================
// Ethereum Explorers
// ============================================================================

const ETHEREUM_MAINNET_EXPLORERS: NetworkExplorers = {
  ETHERSCAN: {
    name: 'Etherscan',
    url: 'https://etherscan.io/tx/{txId}',
  },
};

const ETHEREUM_SEPOLIA_EXPLORERS: NetworkExplorers = {
  ETHERSCAN: {
    name: 'Etherscan Sepolia',
    url: 'https://sepolia.etherscan.io/tx/{txId}',
  },
};

// ============================================================================
// Explorers Configuration
// ============================================================================

/**
 * Complete explorers configuration for all supported blockchains and networks.
 *
 * @example
 * ```typescript
 * const explorer = EXPLORERS.SOLANA['solana-mainnet'].SOLSCAN;
 * const txUrl = explorer.url.replace('{txId}', '5abc...');
 * ```
 */
export const EXPLORERS: ExplorersConfig = {
  SOLANA: {
    mainnet: SOLANA_EXPLORERS,
    'solana-mainnet': SOLANA_EXPLORERS,
    'solana-devnet': SOLANA_EXPLORERS,
  },
  BITCOIN: {
    mainnet: BITCOIN_MAINNET_EXPLORERS,
    testnet: BITCOIN_TESTNET_EXPLORERS,
  },
  ETHEREUM: {
    mainnet: ETHEREUM_MAINNET_EXPLORERS,
    sepolia: ETHEREUM_SEPOLIA_EXPLORERS,
  },
};

/**
 * Default explorer selection for each blockchain.
 *
 * These are the explorers selected by default when no user preference is set.
 */
export const DEFAULT_EXPLORERS: DefaultExplorers = {
  SOLANA: 'SOLSCAN',
  BITCOIN: 'BLOCKCYPHER',
  ETHEREUM: 'ETHERSCAN',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the transaction URL for a specific explorer.
 *
 * @param blockchain - The blockchain (e.g., 'SOLANA', 'BITCOIN')
 * @param environment - The network environment (e.g., 'solana-mainnet', 'testnet')
 * @param explorerKey - The explorer key (e.g., 'SOLSCAN', 'BLOCKCYPHER')
 * @param txId - The transaction ID
 * @returns The complete transaction URL, or null if explorer not found
 *
 * @example
 * ```typescript
 * const url = getTransactionUrl('SOLANA', 'solana-mainnet', 'SOLSCAN', '5abc...');
 * // Returns: 'https://solscan.io/tx/5abc...'
 * ```
 */
export function getTransactionUrl(
  blockchain: Blockchain,
  environment: NetworkEnvironment,
  explorerKey: string,
  txId: string
): string | null {
  const explorer = EXPLORERS[blockchain]?.[environment]?.[explorerKey];
  if (!explorer) {
    return null;
  }
  return explorer.url.replace('{txId}', txId);
}

/**
 * Gets the list of available explorers for a blockchain and network.
 *
 * @param blockchain - The blockchain (e.g., 'SOLANA', 'BITCOIN')
 * @param environment - The network environment (e.g., 'solana-mainnet', 'testnet')
 * @returns Array of explorers with their keys, or empty array if not found
 *
 * @example
 * ```typescript
 * const explorers = getAvailableExplorers('SOLANA', 'solana-mainnet');
 * // Returns: [{ key: 'SOLSCAN', name: 'Solscan', url: '...' }, ...]
 * ```
 */
export function getAvailableExplorers(
  blockchain: Blockchain,
  environment: NetworkEnvironment
): ExplorerWithKey[] {
  const networkExplorers = EXPLORERS[blockchain]?.[environment];
  if (!networkExplorers) {
    return [];
  }

  return Object.keys(networkExplorers).map((key) => ({
    ...networkExplorers[key],
    key,
  }));
}

/**
 * Gets the default explorer for a blockchain.
 *
 * @param blockchain - The blockchain (e.g., 'SOLANA', 'BITCOIN')
 * @returns The default explorer key
 */
export function getDefaultExplorer(blockchain: Blockchain): string {
  return DEFAULT_EXPLORERS[blockchain];
}
