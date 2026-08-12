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
import { generateAccountId, createBlockchainAccountForNetwork } from '../utils/account';
import type {
  Account,
  NetworksAccounts,
  NetworkPathIndexes,
  CreateAccountOptions,
  CreateAccountResult,
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
    mnemonic,
    pathIndexes,
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
