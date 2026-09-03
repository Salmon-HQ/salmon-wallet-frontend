/**
 * Network-related utilities and constants.
 *
 * Consolidated from useMultiChainTokens.ts and useAvailableNetworks.ts.
 *
 * @module utils/network
 */

import type { BlockchainType } from '../types/blockchain';

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
 * Returns a human-readable label for a non-mainnet network, and null for every
 * mainnet — which is the whole rule the environment chip keys off (spec 026
 * D5): a surface shows the chip exactly when this returns something.
 *
 * Takes a plain string rather than `BlockchainId` because both a carousel
 * blockchain key (`solana-devnet`) and a full network id (`solana-mainnet`)
 * reach it, and an id it does not know is a mainnet as far as the chip is
 * concerned.
 */
export function getNetworkLabel(blockchain: string): string | null {
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
 * Formats a network identifier as the human network name a screen reader
 * should say: `solana-devnet` becomes "Solana Devnet", `bitcoin-mainnet`
 * becomes "Bitcoin Mainnet", and a bare chain name such as `Bitcoin` passes
 * through already well formed.
 *
 * Network names are proper nouns and read the same in every language, so this
 * is formatting rather than translation, and deriving the name means a new
 * chain needs no catalogue entry.
 *
 * The ceiling: title-casing each segment assumes every segment is a word, which
 * holds for the whole current catalogue (solana, bitcoin, ethereum, mainnet,
 * devnet, testnet, sepolia) but would mangle an acronym — a future
 * `bsc-mainnet` announces "Bsc Mainnet" instead of "BSC Mainnet". The way out,
 * when a chain like that actually exists, is a small exception map consulted
 * *above* this derivation and falling through to it when there is no entry —
 * never a full table of network names in its place, which is exactly the
 * maintenance burden this avoids.
 *
 * An identifier that cannot be made presentable comes back as itself rather
 * than as a generic "Unknown network": an ugly announcement still carries the
 * network and leaves the user able to notice where they are, and this is the
 * one place where knowing the network is fund safety.
 */
export function getNetworkName(network: string): string {
  return (
    network
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ') || network
  );
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
 * Mainnet network id → the network that mirrors it (devnet / testnet).
 *
 * A mirror shares its keypair with its mainnet counterpart, so the pair is
 * derived together at account creation. The map lives here rather than beside
 * the scan because both the scan and `useUserConfig` need it, and this module
 * has no imports of its own to drag into either.
 */
export const MIRROR_NETWORK_IDS: Record<string, string> = {
  'solana-mainnet': 'solana-devnet',
  'bitcoin-mainnet': 'bitcoin-testnet',
  'ethereum-mainnet': 'ethereum-sepolia',
};

const MAINNET_BY_MIRROR: Record<string, string> = Object.fromEntries(
  Object.entries(MIRROR_NETWORK_IDS).map(([mainnet, mirror]) => [mirror, mainnet])
);

/**
 * Whether a network id names a mainnet.
 */
export function isMainnetNetworkId(networkId: string): boolean {
  return networkId in MIRROR_NETWORK_IDS;
}

/**
 * The mainnet a non-mainnet network mirrors, or undefined for a mainnet (or an
 * unknown id). The inverse of {@link MIRROR_NETWORK_IDS}.
 */
export function getMainnetSibling(networkId: string): string | undefined {
  return MAINNET_BY_MIRROR[networkId];
}

/**
 * Arguments for {@link visibleNetworkIds}.
 */
export interface VisibleNetworkIdsParams {
  /** Network ids the backend catalog has enabled, in the order to offer them. */
  enabled: string[];
  /**
   * Network ids the wallet actually holds an account on. `undefined` means the
   * caller cannot say — nothing is filtered out on that basis.
   */
  held?: string[];
  /** Whether the developer-networks setting is on. */
  developerNetworks: boolean;
  /** The persisted active network, if any. */
  activeNetworkId?: string | null;
}

/**
 * The networks to offer in the carousel and the network panel.
 *
 * The rule, in one place because the carousel, the panel and the tests must
 * not drift: an enabled network the wallet holds is offered when it is a
 * mainnet, when developer mode is on, **or** when it is the network the
 * session is standing on. That last clause is what keeps a devnet session from
 * being stranded on a page nobody can see once the flag goes off.
 */
export function visibleNetworkIds({
  enabled,
  held,
  developerNetworks,
  activeNetworkId,
}: VisibleNetworkIdsParams): string[] {
  const heldSet = held ? new Set(held) : null;

  return enabled.filter((networkId) => {
    if (heldSet && !heldSet.has(networkId)) return false;
    if (isMainnetNetworkId(networkId)) return true;
    return developerNetworks || networkId === activeNetworkId;
  });
}
