/**
 * Account-related domain types.
 *
 * Covers stored account data, full account objects, connection info,
 * user configuration, and edit parameters.
 *
 * @module types/account
 */

import type { BlockchainAccount } from './blockchain';
import type { DefaultExplorers, NetworkEnvironment } from '../config/explorers';

// ============================================================================
// Path / Network accounts
// ============================================================================

/**
 * Represents the path indexes for each network in an account.
 * Key is the network ID (e.g., 'solana-mainnet'), value is an array of account indexes.
 */
export type NetworkPathIndexes = Record<string, (number | null)[]>;

/**
 * Represents the network accounts (blockchain account instances) for each network.
 * Key is the network ID, value is an array of blockchain account instances.
 */
export type NetworksAccounts = Record<string, (BlockchainAccount | null)[]>;

// ============================================================================
// Account models
// ============================================================================

/**
 * Serializable account data for storage.
 * Contains only the data needed to reconstruct accounts (no instances).
 */
export interface StoredAccount {
  /** Unique identifier for the account */
  id: string;
  /** User-defined name for the account */
  name: string;
  /** Avatar identifier */
  avatar: string;
  /** Path indexes by network ID */
  pathIndexes: NetworkPathIndexes;
}

/**
 * The key material an account is built from.
 *
 * A wallet has two ways to own an address, and they are not interchangeable:
 * a BIP39 mnemonic derives a whole tree of addresses across every supported
 * chain, while an imported private key owns exactly one address on one chain.
 * Modelling both as "the mnemonic" is what makes an imported account look
 * derivable and silently vanish on the next unlock, so the difference is
 * carried in the type instead of being inferred at each call site.
 */
export type AccountSecret =
  | {
      kind: 'mnemonic';
      /** BIP39 mnemonic phrase */
      mnemonic: string;
    }
  | {
      kind: 'privateKey';
      /** Base58-encoded 64-byte ed25519 secret key (`seed ‖ publicKey`) */
      privateKey: string;
      /** The single network this key owns an address on */
      networkId: string;
    };

/**
 * Full account with loaded blockchain account instances.
 */
export interface Account extends StoredAccount {
  /** The key material this account is built from */
  secret: AccountSecret;
  /** Loaded blockchain account instances by network */
  networksAccounts: NetworksAccounts;
}

// ============================================================================
// Account creation / restoration
// ============================================================================

/**
 * Options for creating a new account from scratch.
 */
export interface CreateAccountOptions {
  /** Optional custom ID (generates UUID if not provided) */
  id?: string;
  /** Account name (e.g., "Account #1") */
  name: string;
  /** Avatar URL (generates random if not provided) */
  avatar?: string;
  /** BIP39 mnemonic phrase */
  mnemonic: string;
  /** Network IDs to create accounts for (defaults to ['solana-mainnet']) */
  networkIds?: string[];
  /** Starting derivation index (defaults to 0) */
  startIndex?: number;
}

/**
 * Result of account creation.
 */
export interface CreateAccountResult {
  /** The created account with all metadata */
  account: Account;
  /** Blockchain accounts indexed by network ID */
  blockchainAccounts: NetworksAccounts;
}

/**
 * Options for restoring an account from stored data.
 * Unlike CreateAccountOptions, receives pathIndexes directly
 * since they were already persisted.
 */
export interface RestoreAccountOptions {
  name?: string;
  avatar?: string;
  secret: AccountSecret;
  pathIndexes?: NetworkPathIndexes;
}

/**
 * Options for importing an account from a private key.
 *
 * Deliberately separate from {@link CreateAccountOptions}: an import has no
 * derivation index and no multi-network fan-out, so sharing one options bag
 * would mean two thirds of the fields being meaningless in either direction.
 */
export interface ImportAccountOptions {
  /** Optional custom ID (generates UUID if not provided) */
  id?: string;
  /** Account name (e.g., "Account #2") */
  name: string;
  /** Avatar URL (generates random if not provided) */
  avatar?: string;
  /** Base58-encoded 64-byte ed25519 secret key */
  privateKey: string;
  /** Network to import the key on (defaults to 'solana-mainnet') */
  networkId?: string;
}

// ============================================================================
// Edit / connection
// ============================================================================

/**
 * Parameters for editing an account.
 */
export interface EditAccountParams {
  /** New name for the account */
  name?: string;
  /** New avatar for the account */
  avatar?: string;
  /** New derived accounts to add (supports any blockchain type) */
  newDerivedAccounts?: BlockchainAccount[];
}

/**
 * Active connection info for external apps.
 */
export interface ConnectionInfo {
  /** Blockchain type */
  blockchain: string;
  /** Network environment */
  environment: string;
  /** Connected address */
  address: string;
}

// ============================================================================
// User configuration
// ============================================================================

/**
 * Active blockchain account information needed by useUserConfig.
 */
export interface ActiveBlockchainAccount {
  network: {
    /** Network environment (mainnet, testnet, devnet) */
    environment: NetworkEnvironment;
    /** Blockchain type (solana, bitcoin, etc.) */
    blockchain: string;
  };
}

/**
 * User configuration stored in persistent storage.
 */
export interface UserConfig {
  /** Selected explorer for each blockchain */
  explorers: DefaultExplorers;
  /** Whether to show developer/test networks */
  developerNetworks: boolean;
}
