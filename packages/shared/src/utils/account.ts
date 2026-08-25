/**
 * Account utilities for wallet derivation path handling and blockchain type detection.
 */

import type { SolanaAccount, WatchOnlySolanaAccount } from '../blockchain/solana';
import type { BitcoinAccount } from '../blockchain/bitcoin';
import type { EthereumAccount } from '../blockchain/ethereum';
import bs58 from 'bs58';
import {
  createSolanaAccount,
  createSolanaAccountFromSecretKey,
  createWatchOnlySolanaAccount,
  SOLANA_NETWORKS,
} from '../blockchain/solana';
import { createBitcoinAccount, BITCOIN_NETWORKS } from '../blockchain/bitcoin';
import { createEthereumAccount, ETHEREUM_NETWORKS } from '../blockchain/ethereum';
import { bitcoinApiFunctions } from '../api/services/bitcoin';
import { solanaApiFunctions } from '../api/services/solana';
import { ethereumApiFunctions } from '../api/services/ethereum';
import type { BlockchainAccount, BlockchainType } from '../types/blockchain';
import type { Account } from '../types/account';
import type { AccountKeyInfo } from '../types/settings';
import { getBlockchainFromNetworkId } from '../config/blockchains';
import { isBackendNetworkEnabled } from '../api/services/network';
import { fetchAndMergeNetworkConfigs } from '../hooks/useAvailableNetworks';

// Re-export for backward compatibility — canonical definition is in config/blockchains
export { getBlockchainFromNetworkId } from '../config/blockchains';

/**
 * Returns the human-readable display name for a blockchain type.
 */
export function getChainDisplayName(chain?: BlockchainType | string): string {
  switch (chain) {
    case 'bitcoin':
      return 'Bitcoin';
    case 'ethereum':
      return 'Ethereum';
    case 'solana':
    default:
      return 'Solana';
  }
}

// ============================================================================
// Account Type Detection (duck typing)
// ============================================================================

/**
 * Detects the blockchain type from an account instance using duck typing.
 *
 * @param account - The blockchain account to identify
 * @returns The blockchain type ('solana', 'bitcoin', or 'ethereum')
 */
export function getAccountBlockchainType(account: BlockchainAccount): BlockchainType {
  // Check for SolanaAccount - only it exposes the kit RPC accessor
  if ('getRpc' in account) {
    return 'solana';
  }

  // Check for BitcoinAccount - has keyPair property
  if ('keyPair' in account) {
    return 'bitcoin';
  }

  // Check for EthereumAccount - has wallet property
  if ('wallet' in account) {
    return 'ethereum';
  }

  // Default to Solana for backwards compatibility
  return 'solana';
}

/**
 * Type guard to check if account is a Solana account of any kind.
 *
 * Read paths want this one: a watch-only account reads exactly like a
 * signable one. Anything that signs wants `isSignableSolanaAccount`.
 */
export function isSolanaAccount(
  account: BlockchainAccount
): account is SolanaAccount | WatchOnlySolanaAccount {
  return getAccountBlockchainType(account) === 'solana';
}

/**
 * Type guard to check if account is a Solana account that holds key material.
 *
 * This is the guard every signing path must use. `isSolanaAccount` is true for
 * a watch-only account too — it reads like any other — and duck-typing on
 * `getRpc` cannot tell them apart, because a watch-only account needs RPC
 * access to read balances at all.
 */
export function isSignableSolanaAccount(account: BlockchainAccount): account is SolanaAccount {
  return getAccountBlockchainType(account) === 'solana' && 'canSign' in account && account.canSign === true;
}

/**
 * Any account that holds key material, on any chain.
 *
 * The `canSign` literal on the two Solana classes is what makes this `Exclude`
 * work: without it they would be structurally interchangeable and the watch-only
 * type would not be removable from the union.
 */
export type SignableBlockchainAccount = Exclude<BlockchainAccount, WatchOnlySolanaAccount>;

/**
 * Type guard for an account that can sign, on any chain.
 *
 * Chain-agnostic flows (send, fee estimation) want this one; it is the single
 * gate that keeps a watch-only account out of them.
 */
export function isSignableAccount(
  account: BlockchainAccount
): account is SignableBlockchainAccount {
  return !isSolanaAccount(account) || isSignableSolanaAccount(account);
}

/**
 * Type guard to check if account is a BitcoinAccount.
 */
export function isBitcoinAccount(account: BlockchainAccount): account is BitcoinAccount {
  return getAccountBlockchainType(account) === 'bitcoin';
}

/**
 * Type guard to check if account is an EthereumAccount.
 */
export function isEthereumAccount(account: BlockchainAccount): account is EthereumAccount {
  return getAccountBlockchainType(account) === 'ethereum';
}

// ============================================================================
// ID & Name Generation
// ============================================================================

/**
 * Generates a unique identifier for an account.
 * Uses crypto.randomUUID() if available, falls back to timestamp + random.
 */
export function generateAccountId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates an account name using a counter.
 *
 * @example
 * generateAccountName(0); // 'Account #1'
 * generateAccountName(5); // 'Account #6'
 * generateAccountName(0, 'Wallet {{number}}'); // 'Wallet 1'
 */
export function generateAccountName(
  counter: number,
  template: string = 'Account #{{number}}'
): string {
  return template.replace('{{number}}', String(counter + 1));
}

// ============================================================================
// Blockchain Account Routing
// ============================================================================

/**
 * Creates a blockchain account for a specific network.
 * Routes to the appropriate blockchain factory based on the network ID.
 *
 * @param networkId - The network identifier (e.g., 'solana-mainnet', 'bitcoin-testnet')
 * @param mnemonic - BIP39 mnemonic phrase
 * @param index - Account derivation index
 * @returns Promise resolving to the blockchain account, or null if network not found
 */
export async function createBlockchainAccountForNetwork(
  networkId: string,
  mnemonic: string,
  index: number
): Promise<BlockchainAccount | null> {
  await fetchAndMergeNetworkConfigs();

  // Backend network catalog is the source of truth.
  if (!(await isBackendNetworkEnabled(networkId))) {
    console.warn(`Blockchain disabled for network: ${networkId}`);
    return null;
  }

  const blockchainType = getBlockchainFromNetworkId(networkId);

  switch (blockchainType) {
    case 'bitcoin': {
      const network = BITCOIN_NETWORKS[networkId];
      if (!network) {
        console.warn(`Unknown Bitcoin network: ${networkId}`);
        return null;
      }
      return createBitcoinAccount({ network, mnemonic, index, apiFunctions: bitcoinApiFunctions });
    }

    case 'ethereum': {
      const network = ETHEREUM_NETWORKS[networkId];
      if (!network) {
        console.warn(`Unknown Ethereum network: ${networkId}`);
        return null;
      }
      return createEthereumAccount({
        network,
        mnemonic,
        index,
        apiFunctions: ethereumApiFunctions,
      });
    }

    case 'solana':
    default: {
      const network = SOLANA_NETWORKS[networkId];
      if (!network) {
        console.warn(`Unknown Solana network: ${networkId}`);
        return null;
      }
      return createSolanaAccount({ network, mnemonic, index, apiFunctions: solanaApiFunctions });
    }
  }
}

/**
 * Builds a blockchain account from an imported private key.
 *
 * Only Solana is supported: Bitcoin and Ethereum export key material in
 * formats of their own (WIF, 32-byte hex) that the import UI does not accept,
 * so pretending to handle them here would produce an account that fails at
 * signing time rather than at import time.
 *
 * @param networkId - Solana network the key is being imported on
 * @param privateKey - Base58-encoded 64-byte ed25519 secret key
 * @returns The Solana account controlled by that key
 * @throws When the network is unknown, not a Solana network, or disabled
 */
export async function createBlockchainAccountFromPrivateKey(
  networkId: string,
  privateKey: string
): Promise<BlockchainAccount> {
  await fetchAndMergeNetworkConfigs();

  if (getBlockchainFromNetworkId(networkId) !== 'solana') {
    throw new Error(`Private key import is not supported for network: ${networkId}`);
  }

  const network = SOLANA_NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unknown Solana network: ${networkId}`);
  }

  // The key is stored base58-encoded (the same form the wallet exports), so it
  // is decoded here rather than kept as bytes in the vault — bytes would
  // serialise to a JSON object of numbered keys and quietly change the vault
  // format for every existing user.
  return createSolanaAccountFromSecretKey(network, bs58.decode(privateKey), 0, solanaApiFunctions);
}

/**
 * Every Solana address the wallet already holds, across accounts and indexes.
 *
 * Both import flows reject an address that is already present: importing one
 * twice shows the same balance in two places and makes "which one do I send
 * from" unanswerable.
 */
export function collectSolanaAddresses(accounts: Account[]): Set<string> {
  const addresses = new Set<string>();
  for (const account of accounts) {
    for (const networkAccounts of Object.values(account.networksAccounts)) {
      for (const blockchainAccount of networkAccounts ?? []) {
        const address = blockchainAccount?.getReceiveAddress?.();
        if (address) addresses.add(address);
      }
    }
  }
  return addresses;
}

/**
 * Creates a watch-only blockchain account for an address the wallet does not
 * hold the key to.
 *
 * @param networkId - Solana network the address is watched on
 * @param watchedAddress - Base58 Solana address
 * @returns A read-only account for that address
 * @throws When the network is unknown, not a Solana network, or disabled
 */
export async function createBlockchainAccountForWatchOnly(
  networkId: string,
  watchedAddress: string
): Promise<BlockchainAccount> {
  await fetchAndMergeNetworkConfigs();

  if (getBlockchainFromNetworkId(networkId) !== 'solana') {
    throw new Error(`Watch-only import is not supported for network: ${networkId}`);
  }

  const network = SOLANA_NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unknown Solana network: ${networkId}`);
  }

  return createWatchOnlySolanaAccount(network, watchedAddress, solanaApiFunctions);
}

// ============================================================================
// Derivation Path Utilities
// ============================================================================

/**
 * Extracts the account index from a BIP44 derivation path.
 *
 * BIP44 paths follow the format: m / purpose' / coin_type' / account' / change / address_index
 * For Solana (coin type 501): m/44'/501'/account'/0'
 *
 * @param path - The BIP44 derivation path string (e.g., "m/44'/501'/0'/0'")
 * @returns The account index as a number, or undefined if the path is invalid
 *
 * @example
 * // Returns 0
 * getPathIndex("m/44'/501'/0'/0'")
 *
 * @example
 * // Returns 5
 * getPathIndex("m/44'/501'/5'/0'")
 *
 * @example
 * // Returns undefined for invalid paths
 * getPathIndex("invalid-path")
 */
export function getPathIndex(path: string): number | undefined {
  const index = Number(path?.split('/')?.[3]?.replace("'", ''));
  return !isNaN(index) ? index : undefined;
}

// ============================================================================
// Private Key Reveal Utilities
// ============================================================================

/**
 * Builds a network list from an account's networksAccounts, filtering out
 * networks that have no loaded accounts.
 *
 * Shared between mobile and extension private key reveal screens.
 */
export function buildNetworkListFromAccount(
  activeAccount: Account | null | undefined
): Array<{ id: string; name: string; blockchain: string }> {
  if (!activeAccount?.networksAccounts) return [];

  return Object.keys(activeAccount.networksAccounts)
    .filter((id) => {
      const accounts = activeAccount.networksAccounts[id];
      return accounts && accounts.some((a) => a !== null);
    })
    .map((id) => {
      const blockchain = getBlockchainFromNetworkId(id);
      const name = id
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      return { id, name, blockchain };
    });
}

/**
 * Returns the primary receive address for an account.
 * Prefers solana-mainnet, falls back to any available network.
 */
export function getAccountAddress(account: Account): string {
  const { networksAccounts } = account;
  const mainnetAccounts = networksAccounts['solana-mainnet'];
  if (mainnetAccounts) {
    const active = mainnetAccounts.find(Boolean);
    if (active) return active.getReceiveAddress?.() || '';
  }
  for (const networkAccounts of Object.values(networksAccounts)) {
    if (networkAccounts) {
      const active = networkAccounts.find(Boolean);
      if (active) return active.getReceiveAddress?.() || '';
    }
  }
  return '';
}

/**
 * Resolves the Solana account to use for dApp approvals.
 * Prefers the currently active Solana account, otherwise falls back to the
 * matching path index on solana-mainnet and then to the first available Solana account.
 */
export function getActiveSolanaApprovalAccount(
  activeAccount: Account | null | undefined,
  activeBlockchainAccount: BlockchainAccount | null | undefined,
  pathIndex = 0
): SolanaAccount | null {
  // A watch-only active account must fail closed here, not fall through to the
  // loop below — that would answer a dApp request with a different, signable
  // account than the one the user has selected.
  if (activeBlockchainAccount && isSolanaAccount(activeBlockchainAccount)) {
    return isSignableSolanaAccount(activeBlockchainAccount) ? activeBlockchainAccount : null;
  }

  if (!activeAccount?.networksAccounts) return null;

  const candidateNetworkIds = [
    'solana-mainnet',
    ...Object.keys(activeAccount.networksAccounts).filter(
      (id) => id.startsWith('solana-') && id !== 'solana-mainnet'
    ),
  ];

  for (const networkId of candidateNetworkIds) {
    const networkAccounts = activeAccount.networksAccounts[networkId];
    if (!networkAccounts?.length) continue;

    const preferred = networkAccounts[pathIndex];
    if (preferred && isSignableSolanaAccount(preferred)) {
      return preferred;
    }

    const fallback = networkAccounts.find((account): account is SolanaAccount => {
      if (!account) return false;
      return isSignableSolanaAccount(account);
    });
    if (fallback) return fallback;
  }

  return null;
}

/**
 * Extracts AccountKeyInfo (path, address, privateKey) for every non-null
 * account in a specific network.
 *
 * Shared between mobile and extension private key reveal screens.
 */
export function getAccountKeysForNetwork(
  activeAccount: Account | null | undefined,
  networkId: string | null
): AccountKeyInfo[] {
  if (!networkId || !activeAccount?.networksAccounts) return [];
  const networkAccounts = activeAccount.networksAccounts[networkId];
  if (!networkAccounts) return [];

  return networkAccounts
    .filter((account): account is NonNullable<typeof account> => account !== null)
    .filter((account) => !isSolanaAccount(account) || isSignableSolanaAccount(account))
    .map((account) => ({
      path: account.path,
      address: account.getReceiveAddress(),
      privateKey: account.retrieveSecurePrivateKey(),
    }));
}
