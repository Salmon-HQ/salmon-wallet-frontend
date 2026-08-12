import { HDNodeWallet, Wallet } from 'ethers';
import { EthereumAccount } from './EthereumAccount';
import type { EthereumNetwork } from '../../types/blockchain';

// Re-export for backward compatibility — canonical definition is in ./networks
export { ETHEREUM_NETWORKS } from './networks';
import type { EthereumAccountApiFunctions } from '../../types/transfer';
import { mnemonicToSeed } from '../../crypto/mnemonic';

/**
 * SLIP-0044 coin type for Ethereum
 * @see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 */
export const ETHEREUM_COIN_TYPE = 60;

/**
 * Options for creating an Ethereum account from mnemonic
 */
export interface CreateEthereumAccountOptions {
  /** Network configuration */
  network: EthereumNetwork;
  /** BIP39 mnemonic phrase */
  mnemonic: string;
  /** Account derivation index (defaults to 0) */
  index?: number;
  /** API functions for dependency injection */
  apiFunctions: EthereumAccountApiFunctions;
}

/**
 * Options for deriving multiple accounts from a single mnemonic
 */
export interface DeriveEthereumAccountsOptions {
  /** Network configuration */
  network: EthereumNetwork;
  /** BIP39 mnemonic phrase */
  mnemonic: string;
  /** Starting index for derivation (defaults to 0) */
  startIndex?: number;
  /** Number of accounts to derive (defaults to 1) */
  count?: number;
  /** API functions for dependency injection */
  apiFunctions: EthereumAccountApiFunctions;
}

/**
 * Generates the BIP44 derivation path for Ethereum accounts.
 *
 * Uses the standard Ethereum derivation path format:
 * m/44'/60'/0'/0/{index}
 *
 * This matches the path used by MetaMask, Ledger, and other popular wallets.
 *
 * @param index - Account index
 * @returns BIP44 derivation path string
 */
export function getEthereumDerivationPath(index: number): string {
  return `m/44'/${ETHEREUM_COIN_TYPE}'/0'/0/${index}`;
}

/**
 * Creates an EthereumAccount instance from a mnemonic phrase.
 *
 * This is the primary factory function for creating Ethereum accounts.
 * It derives the wallet from the mnemonic using the standard BIP44 path
 * for Ethereum (m/44'/60'/0'/0/{index}).
 *
 * @param options - Account creation options
 * @returns Promise resolving to EthereumAccount instance
 *
 * @example
 * ```typescript
 * const account = await createEthereumAccount({
 *   network: ETHEREUM_NETWORKS['ethereum-mainnet'],
 *   mnemonic: 'your twelve word mnemonic phrase here...',
 *   index: 0
 * });
 *
 * console.log(`Address: ${account.getReceiveAddress()}`);
 * ```
 */
export async function createEthereumAccount(
  options: CreateEthereumAccountOptions
): Promise<EthereumAccount> {
  const { network, mnemonic, index = 0, apiFunctions } = options;

  const path = getEthereumDerivationPath(index);

  // Use pre-computed seed from mnemonicToSeed (cached + native PBKDF2 on mobile).
  // HDNodeWallet.fromPhrase would run its own synchronous JS PBKDF2 internally,
  // duplicating the expensive derivation we already did.
  const seed = await mnemonicToSeed(mnemonic);
  const hdWallet = HDNodeWallet.fromSeed(seed).derivePath(path);

  // Convert to regular Wallet for consistency
  const wallet = new Wallet(hdWallet.privateKey);

  return new EthereumAccount({
    network,
    index,
    path,
    wallet,
    ...apiFunctions,
  });
}

/**
 * Derives multiple Ethereum accounts from a single mnemonic.
 *
 * Useful for implementing account discovery or allowing users
 * to manage multiple accounts from the same seed.
 *
 * @param options - Derivation options
 * @returns Promise resolving to array of EthereumAccount instances
 *
 * @example
 * ```typescript
 * // Derive 5 accounts starting from index 0
 * const accounts = await deriveEthereumAccounts({
 *   network: ETHEREUM_NETWORKS['ethereum-mainnet'],
 *   mnemonic: 'your mnemonic...',
 *   startIndex: 0,
 *   count: 5
 * });
 * ```
 */
export async function deriveEthereumAccounts(
  options: DeriveEthereumAccountsOptions
): Promise<EthereumAccount[]> {
  const { network, mnemonic, startIndex = 0, count = 1, apiFunctions } = options;

  const accounts: EthereumAccount[] = [];

  for (let i = 0; i < count; i++) {
    const account = await createEthereumAccount({
      network,
      mnemonic,
      index: startIndex + i,
      apiFunctions,
    });
    accounts.push(account);
  }

  return accounts;
}

/**
 * Creates an EthereumAccount from an existing Wallet instance.
 *
 * Use this when you already have a wallet (e.g., imported from a private key)
 * and want to wrap it in an EthereumAccount.
 *
 * @param network - Network configuration
 * @param wallet - Existing ethers.js Wallet instance
 * @param index - Optional account index (defaults to 0)
 * @returns EthereumAccount instance
 */
export function createEthereumAccountFromWallet(
  network: EthereumNetwork,
  wallet: Wallet,
  index: number = 0,
  apiFunctions: EthereumAccountApiFunctions
): EthereumAccount {
  return new EthereumAccount({
    network,
    index,
    path: getEthereumDerivationPath(index),
    wallet,
    ...apiFunctions,
  });
}

/**
 * Creates an EthereumAccount from a private key.
 *
 * @param network - Network configuration
 * @param privateKey - Private key (hex string, with or without 0x prefix)
 * @param index - Optional account index (defaults to 0)
 * @returns EthereumAccount instance
 *
 * @example
 * ```typescript
 * const account = createEthereumAccountFromPrivateKey(
 *   ETHEREUM_NETWORKS['ethereum-mainnet'],
 *   '0x...',
 *   0
 * );
 * ```
 */
export function createEthereumAccountFromPrivateKey(
  network: EthereumNetwork,
  privateKey: string,
  index: number = 0,
  apiFunctions: EthereumAccountApiFunctions
): EthereumAccount {
  const wallet = new Wallet(privateKey);
  return createEthereumAccountFromWallet(network, wallet, index, apiFunctions);
}
