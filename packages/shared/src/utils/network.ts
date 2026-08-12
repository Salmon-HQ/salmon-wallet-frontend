/**
 * Network-related utilities and constants.
 *
 * Consolidated from useMultiChainTokens.ts and useAvailableNetworks.ts.
 *
 * @module utils/network
 */

import type { BlockchainType } from '../types/blockchain';
import type { BlockchainId } from '../types/ui/balance-card';

/**
 * Mainnet network IDs for each blockchain.
 * Single source of truth used by useMultiChainTokens and useAvailableNetworks.
 */
export const MAINNET_NETWORK_IDS: Record<BlockchainType, string[]> = {
  solana: ['solana-mainnet'],
  bitcoin: ['bitcoin-mainnet'],
  ethereum: ['ethereum-mainnet'],
};

/**
 * Flat record mapping chain to its mainnet network ID.
 * Convenience alias for hooks that need a single ID per chain.
 */
export const MAINNET_NETWORK_ID: Record<BlockchainType, string> = {
  solana: 'solana-mainnet',
  bitcoin: 'bitcoin-mainnet',
  ethereum: 'ethereum-mainnet',
};

/**
 * Returns a human-readable label for non-mainnet blockchain IDs.
 * Returns null for mainnet networks.
 */
export function getNetworkLabel(blockchain: BlockchainId): string | null {
  switch (blockchain) {
    case 'solana-devnet':
      return 'Devnet';
    case 'bitcoin-testnet':
      return 'Testnet';
    case 'ethereum-sepolia':
      return 'Sepolia';
    default:
      return null;
  }
}

/**
 * Sorts networks according to a predefined order.
 * Networks not in the order list are placed at the end in their original order.
 */
export function sortNetworks<T extends { id: string }>(networks: T[], order: string[]): T[] {
  return networks.sort((a, b) => {
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });
}

/**
 * Filters networks based on whether developer mode is enabled.
 * When developer mode is off, only mainnet networks are included.
 */
export function filterNetworks<T extends { id: string }>(
  networks: Record<string, T>,
  mainnetIds: string[],
  developerNetworks: boolean,
  order: string[]
): T[] {
  const filtered = Object.entries(networks)
    .filter(([key, network]) => {
      if (developerNetworks) {
        return true;
      }
      return mainnetIds.includes(key) || mainnetIds.includes(network.id);
    })
    .map(([, network]) => network);

  return sortNetworks(filtered, order);
}
