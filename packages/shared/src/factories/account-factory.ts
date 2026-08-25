/**
 * Account Factory - Creates accounts with blockchain accounts
 *
 * This factory consolidates account creation logic, similar to V2's
 * account-factory.js but adapted for V3's TypeScript architecture.
 *
 * Supports multi-chain account derivation:
 * - Solana (solana-mainnet, solana-devnet)
 * - Bitcoin (bitcoin-mainnet, bitcoin-testnet)
 * - Ethereum (ethereum-mainnet, ethereum-sepolia)
 *
 * @module factories/account-factory
 */

import { getRandomAvatar } from '../utils/avatar';
import {
  generateAccountId,
  createBlockchainAccountForNetwork,
  createBlockchainAccountFromPrivateKey,
  createBlockchainAccountForWatchOnly,
} from '../utils/account';
import type {
  Account,
  NetworksAccounts,
  NetworkPathIndexes,
  CreateAccountOptions,
  CreateAccountResult,
  ImportAccountOptions,
  ImportWatchOnlyOptions,
} from '../types/account';
import type { BlockchainAccount } from '../types/blockchain';

/**
 * Creates an Account with derived blockchain accounts.
 *
 * This function:
 * - Generates a unique ID if not provided
 * - Creates blockchain accounts for specified networks (Solana, Bitcoin, Ethereum)
 * - Derives accounts from the mnemonic using BIP44 paths
 * - Returns a complete Account object ready for use
 *
 * @param options - Account creation options
 * @returns Promise resolving to account and blockchain accounts
 *
 * @example
 * ```typescript
 * // Create account with all blockchains
 * const result = await createAccount({
 *   name: 'My Wallet',
 *   mnemonic: 'abandon abandon abandon...',
 *   networkIds: ['solana-mainnet', 'bitcoin-mainnet', 'ethereum-mainnet'],
 * });
 *
 * console.log(result.account.id); // 'uuid-here'
 * console.log(result.account.name); // 'My Wallet'
 * console.log(result.blockchainAccounts['solana-mainnet'][0]); // SolanaAccount
 * console.log(result.blockchainAccounts['bitcoin-mainnet'][0]); // BitcoinAccount
 * console.log(result.blockchainAccounts['ethereum-mainnet'][0]); // EthereumAccount
 * ```
 */
export async function createAccount(options: CreateAccountOptions): Promise<CreateAccountResult> {
  const {
    id = generateAccountId(),
    name,
    avatar = getRandomAvatar(),
    mnemonic,
    networkIds = ['solana-mainnet'],
    startIndex = 0,
  } = options;

  const networksAccounts: NetworksAccounts = {};
  const pathIndexes: NetworkPathIndexes = {};

  const createdAccounts = await Promise.all(
    networkIds.map(async (networkId) => {
      try {
        const blockchainAccount = await createBlockchainAccountForNetwork(
          networkId,
          mnemonic,
          startIndex
        );

        if (!blockchainAccount) {
          console.warn(`Skipping unknown network: ${networkId}`);
          return null;
        }

        return { networkId, blockchainAccount };
      } catch (error) {
        console.error(`Failed to create account for network ${networkId}:`, error);
        throw error;
      }
    })
  );

  createdAccounts.forEach((entry) => {
    if (!entry) return;

    networksAccounts[entry.networkId] = [entry.blockchainAccount];
    pathIndexes[entry.networkId] = [startIndex];
  });

  const account: Account = {
    id,
    name,
    avatar,
    secret: { kind: 'mnemonic', mnemonic },
    pathIndexes,
    networksAccounts,
  };

  return { account, blockchainAccounts: networksAccounts };
}

/**
 * Creates an Account from an imported private key.
 *
 * Kept apart from {@link createAccount} on purpose: an import has no
 * derivation index and no multi-chain fan-out, so it owns exactly one address
 * on one network. Callers get the same {@link CreateAccountResult} shape, so
 * the account lands in storage through the ordinary `addAccount` path.
 *
 * @param options - Import options (name, base58 private key, network)
 * @returns Promise resolving to the account and its single blockchain account
 * @throws When the key does not belong to a supported Solana network
 *
 * @example
 * ```typescript
 * const { account } = await importAccountFromPrivateKey({
 *   name: 'Imported',
 *   privateKey: '4wBqpZM9...',
 * });
 * ```
 */
export async function importAccountFromPrivateKey(
  options: ImportAccountOptions
): Promise<CreateAccountResult> {
  const {
    id = generateAccountId(),
    name,
    avatar = getRandomAvatar(),
    privateKey,
    networkId = 'solana-mainnet',
  } = options;

  const blockchainAccount = await createBlockchainAccountFromPrivateKey(networkId, privateKey);

  const networksAccounts: NetworksAccounts = { [networkId]: [blockchainAccount] };

  const account: Account = {
    id,
    name,
    avatar,
    secret: { kind: 'privateKey', privateKey, networkId },
    // Index 0 is the only slot an imported key occupies; it is not a
    // derivation index, just the position the rest of the app indexes by.
    pathIndexes: { [networkId]: [0] },
    networksAccounts,
  };

  return { account, blockchainAccounts: networksAccounts };
}

/**
 * Imports a watch-only account from a public Solana address.
 *
 * The account carries an explicit `watchOnly` secret rather than no vault row
 * at all. That is not bookkeeping: `toAccountSecret` reads a missing row as a
 * mnemonic, so an account without one would be restored as a mnemonic account
 * with an empty phrase on every unlock.
 *
 * @param options - Watch-only import options
 * @returns The account and its blockchain accounts
 *
 * @example
 * ```typescript
 * const { account } = await importWatchOnlyAccount({
 *   name: 'Watched',
 *   address: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
 * });
 * ```
 */
export async function importWatchOnlyAccount(
  options: ImportWatchOnlyOptions
): Promise<CreateAccountResult> {
  const {
    id = generateAccountId(),
    name,
    avatar = getRandomAvatar(),
    address,
    networkId = 'solana-mainnet',
  } = options;

  const blockchainAccount = await createBlockchainAccountForWatchOnly(networkId, address);

  const networksAccounts: NetworksAccounts = { [networkId]: [blockchainAccount] };

  const account: Account = {
    id,
    name,
    avatar,
    secret: { kind: 'watchOnly', address, networkId },
    // Index 0 is the only slot a watched address occupies; nothing was derived.
    pathIndexes: { [networkId]: [0] },
    networksAccounts,
  };

  return { account, blockchainAccounts: networksAccounts };
}

/**
 * Derives additional blockchain accounts for an existing account.
 * Useful for adding new networks or additional derivation paths.
 *
 * Supports Solana, Bitcoin, and Ethereum networks.
 *
 * @param mnemonic - BIP39 mnemonic phrase
 * @param networkId - Network to derive account for
 * @param index - Derivation index
 * @returns Promise resolving to blockchain account instance
 *
 * @example
 * ```typescript
 * // Derive Solana account
 * const solana = await deriveBlockchainAccount(mnemonic, 'solana-mainnet', 1);
 *
 * // Derive Bitcoin account
 * const bitcoin = await deriveBlockchainAccount(mnemonic, 'bitcoin-mainnet', 0);
 *
 * // Derive Ethereum account
 * const ethereum = await deriveBlockchainAccount(mnemonic, 'ethereum-mainnet', 0);
 * ```
 */
export async function deriveBlockchainAccount(
  mnemonic: string,
  networkId: string,
  index: number
): Promise<BlockchainAccount> {
  const blockchainAccount = await createBlockchainAccountForNetwork(networkId, mnemonic, index);

  if (!blockchainAccount) {
    throw new Error(`Unknown network: ${networkId}`);
  }

  return blockchainAccount;
}
