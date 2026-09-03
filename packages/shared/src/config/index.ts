/**
 * Configuration module.
 *
 * This module exports all configuration constants and types.
 *
 * @module config
 */

export {
  // Types
  type Blockchain,
  type NetworkEnvironment,
  type Explorer,
  type ExplorerWithKey,
  type NetworkExplorers,
  type BlockchainExplorers,
  type ExplorersConfig,
  type DefaultExplorers,
  // Constants
  EXPLORERS,
  DEFAULT_EXPLORERS,
  // Helper functions
  getTransactionUrl,
  getAvailableExplorers,
  getDefaultExplorer,
} from './explorers';

// Legacy local blockchain config helpers.
// Backend `/v1/networks` is the runtime source of truth for enablement.
export { ENABLED_BLOCKCHAINS, isBlockchainEnabled } from './blockchains';

// Public Bitcoin relays — the client broadcasts signed transactions directly.
export { BITCOIN_BROADCAST_RELAYS, getBitcoinBroadcastRelays } from './bitcoin-relays';
