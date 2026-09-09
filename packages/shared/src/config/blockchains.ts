/**
 * Legacy local blockchain defaults.
 *
 * Backend `/v1/networks` is the runtime source of truth for enablement.
 * This module only keeps local helpers/defaults for static typing and
 * last-resort config composition.
 *
 * @module config/blockchains
 */

import type { BlockchainType } from '../types/blockchain';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Legacy local blockchain defaults used when composing static config.
 */
export const ENABLED_BLOCKCHAINS: readonly BlockchainType[] = [
  'solana',
  'bitcoin',
  // 'ethereum',
] as const;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Determines the blockchain type from a network ID string.
 *
 * @param networkId - Network identifier (e.g., 'solana-mainnet', 'bitcoin-testnet', 'ethereum-sepolia')
 * @returns The blockchain type ('solana', 'bitcoin', or 'ethereum')
 */
export function getBlockchainFromNetworkId(networkId: string): BlockchainType {
  if (networkId.startsWith('bitcoin')) return 'bitcoin';
  if (networkId.startsWith('ethereum')) return 'ethereum';
  return 'solana';
}

/**
 * Returns true if the given blockchain family is enabled by the legacy local
 * defaults.
 *
 * @deprecated The backend network catalog is the runtime source of truth.
 * Prefer `isBackendNetworkEnabled` from `api/services/network` (async) for
 * any gate that runs in production code paths.
 *
 * @param chain - Blockchain type to check (e.g. 'solana', 'bitcoin', 'ethereum')
 */
export function isBlockchainEnabled(chain: BlockchainType): boolean {
  return ENABLED_BLOCKCHAINS.includes(chain);
}
