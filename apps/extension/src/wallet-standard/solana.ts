// This is copied from @solana/wallet-standard-chains

import type { IdentifierString } from '@wallet-standard/base';

/** Solana Mainnet (beta) cluster, e.g. https://api.mainnet-beta.solana.com */
export const SOLANA_MAINNET_CHAIN = 'solana:mainnet';

/** Solana Devnet cluster, e.g. https://api.devnet.solana.com */
export const SOLANA_DEVNET_CHAIN = 'solana:devnet';

/** Solana Testnet cluster, e.g. https://api.testnet.solana.com */
export const SOLANA_TESTNET_CHAIN = 'solana:testnet';

/** Array of all Solana clusters */
export const SOLANA_CHAINS = [
  SOLANA_MAINNET_CHAIN,
  SOLANA_DEVNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
] as const;

/** Type of all Solana clusters */
export type SolanaChain = (typeof SOLANA_CHAINS)[number];

/**
 * Check if a chain corresponds with one of the Solana clusters.
 */
export function isSolanaChain(chain: IdentifierString): chain is SolanaChain {
  return SOLANA_CHAINS.includes(chain as SolanaChain);
}

/**
 * Map supported Solana clusters to supported Salmon networks.
 *
 * The wallet's own ids, not the bare cluster names. The approval screen
 * compares what the request declares against the network the wallet is on, and
 * that side is always spelled `solana-mainnet`; returning `mainnet` here made
 * the two sides disagree for every caller, so the guard fired on an honest
 * request and said nothing about a dishonest one.
 */
export function getNetworkForChain(chain: SolanaChain): string {
  switch (chain) {
    case SOLANA_MAINNET_CHAIN:
      return 'solana-mainnet';
    case SOLANA_DEVNET_CHAIN:
      return 'solana-devnet';
    case SOLANA_TESTNET_CHAIN:
      return 'solana-testnet';
    default:
      return 'solana-mainnet';
  }
}
