import * as bitcoin from 'bitcoinjs-lib';
import { BitcoinAccount, BitcoinKeyPair } from './BitcoinAccount';
import type { BitcoinNetwork } from '../../types/blockchain';

// Re-export for backward compatibility — canonical definition is in ./networks
export { BITCOIN_NETWORKS } from './networks';
import type { BitcoinAccountApiFunctions } from '../../types/transfer';
import type { BitcoinNetworkId } from '../../types/blockchain';
import { deriveBitcoinKeypair, COIN_TYPES, BITCOIN_PATH } from '../../crypto/mnemonic';

/**
 * SLIP-0044 coin type for Bitcoin
 * Re-exported from crypto/mnemonic for convenience
 * @see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 */
export const BITCOIN_COIN_TYPE = COIN_TYPES.BTC;

/**
 * SLIP-0044 coin type for Bitcoin Testnet
 */
export const BITCOIN_TESTNET_COIN_TYPE = COIN_TYPES.TESTNET;

/**
 * Options for creating a Bitcoin account from mnemonic
 */
export interface CreateBitcoinAccountOptions {
  /** Network configuration */
  network: BitcoinNetwork;
  /** BIP39 mnemonic phrase */
  mnemonic: string;
  /** Account derivation index (defaults to 0) */
  index?: number;
  /** API dependency functions */
  apiFunctions: BitcoinAccountApiFunctions;
}

/**
 * Options for deriving multiple accounts from a single mnemonic
 */
export interface DeriveBitcoinAccountsOptions {
  /** Network configuration */
  network: BitcoinNetwork;
  /** BIP39 mnemonic phrase */
  mnemonic: string;
  /** Starting index for derivation (defaults to 0) */
  startIndex?: number;
  /** Number of accounts to derive (defaults to 1) */
  count?: number;
  /** API dependency functions */
  apiFunctions: BitcoinAccountApiFunctions;
}

/**
 * Maps a network ID to the bitcoinjs-lib network configuration.
 *
 * @param networkId - Bitcoin network identifier
 * @returns bitcoinjs-lib Network configuration
 */
export function mapNetworkIdToLibNetwork(networkId: BitcoinNetworkId): bitcoin.Network {
  switch (networkId) {
    case 'bitcoin-testnet':
      return bitcoin.networks.testnet;
    case 'bitcoin-mainnet':
    default:
      return bitcoin.networks.bitcoin;
  }
}

/**
 * @deprecated Use `mapNetworkIdToLibNetwork` instead.
 */
export function mapEnvironmentToNetwork(environment: 'mainnet' | 'testnet'): bitcoin.Network {
  switch (environment) {
    case 'testnet':
      return bitcoin.networks.testnet;
    case 'mainnet':
    default:
      return bitcoin.networks.bitcoin;
  }
}

/**
 * Generates the BIP44 derivation path for Bitcoin accounts.
 *
 * Uses the standard Bitcoin derivation path format:
 * m/44'/0'/{index}'/0/0
 *
 * @param index - Account index
 * @returns BIP44 derivation path string
 */
export function getBitcoinDerivationPath(index: number): string {
  return BITCOIN_PATH(index);
}

/**
 * Creates a BitcoinKeyPair from a BIP32 node and network.
 *
 * @param node - BIP32 node from HD derivation
 * @param network - bitcoinjs-lib network configuration
 * @returns BitcoinKeyPair with address, WIF private key, and public key
 */
export function createKeyPairFromNode(
  node: ReturnType<typeof deriveBitcoinKeypair> extends Promise<infer T>
    ? T extends { node: infer N }
      ? N
      : never
    : never,
  network: bitcoin.Network
): BitcoinKeyPair {
  // Generate P2PKH address from public key
  const { address } = bitcoin.payments.p2pkh({
    pubkey: node.publicKey,
    network,
  });

  if (!address) {
    throw new Error('Failed to generate Bitcoin address from public key');
  }

  // Get WIF-encoded private key
  const privateKeyWIF = node.toWIF();

  return {
    address,
    privateKeyWIF,
    publicKey: node.publicKey,
  };
}

/**
 * Creates a BitcoinAccount instance from a mnemonic phrase.
 *
 * This is the primary factory function for creating Bitcoin accounts.
 * It derives the keypair from the mnemonic using the standard BIP44 path
 * for Bitcoin (m/44'/0'/{index}'/0/0).
 *
 * @param options - Account creation options
 * @returns Promise resolving to BitcoinAccount instance
 *
 * @example
 * ```typescript
 * const account = await createBitcoinAccount({
 *   network: BITCOIN_NETWORKS['bitcoin-mainnet'],
 *   mnemonic: 'your twelve word mnemonic phrase here...',
 *   index: 0
 * });
 *
 * console.log(`Address: ${account.getReceiveAddress()}`);
 * ```
 */
export async function createBitcoinAccount(
  options: CreateBitcoinAccountOptions
): Promise<BitcoinAccount> {
  const { network, mnemonic, index = 0, apiFunctions } = options;

  // Derive the BIP32 node from mnemonic
  const { node, path } = await deriveBitcoinKeypair(mnemonic, index);

  // Get the bitcoinjs-lib network configuration
  const btcNetwork = network.config.network;

  // Create the keypair from the derived node
  const keyPair = createKeyPairFromNode(node, btcNetwork);

  return new BitcoinAccount({
    network,
    index,
    path,
    keyPair,
    node,
    ...apiFunctions,
  });
}

/**
 * Derives multiple Bitcoin accounts from a single mnemonic.
 *
 * Useful for implementing account discovery or allowing users
 * to manage multiple accounts from the same seed.
 *
 * @param options - Derivation options
 * @returns Promise resolving to array of BitcoinAccount instances
 *
 * @example
 * ```typescript
 * // Derive 5 accounts starting from index 0
 * const accounts = await deriveBitcoinAccounts({
 *   network: BITCOIN_NETWORKS['bitcoin-mainnet'],
 *   mnemonic: 'your mnemonic...',
 *   startIndex: 0,
 *   count: 5
 * });
 * ```
 */
export async function deriveBitcoinAccounts(
  options: DeriveBitcoinAccountsOptions
): Promise<BitcoinAccount[]> {
  const { network, mnemonic, startIndex = 0, count = 1, apiFunctions } = options;

  const accounts: BitcoinAccount[] = [];

  for (let i = 0; i < count; i++) {
    const account = await createBitcoinAccount({
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
 * Creates a BitcoinAccount from an existing keypair.
 *
 * Use this when you already have a keypair (e.g., imported from WIF)
 * and want to wrap it in a BitcoinAccount.
 *
 * @param network - Network configuration
 * @param keyPair - Existing BitcoinKeyPair
 * @param index - Optional account index (defaults to 0)
 * @returns BitcoinAccount instance
 */
export function createBitcoinAccountFromKeyPair(
  network: BitcoinNetwork,
  keyPair: BitcoinKeyPair,
  index: number = 0,
  apiFunctions: BitcoinAccountApiFunctions
): BitcoinAccount {
  return new BitcoinAccount({
    network,
    index,
    path: getBitcoinDerivationPath(index),
    keyPair,
    ...apiFunctions,
  });
}

/**
 * Creates a BitcoinAccount from a WIF-encoded private key.
 *
 * Note: This function requires the @bitcoinerlab/secp256k1 library to derive
 * the public key from the private key. If WIF import is needed, consider using
 * the ECPairFactory from ecpair package with tiny-secp256k1.
 *
 * @param network - Network configuration
 * @param wif - WIF-encoded private key string
 * @param address - The P2PKH address corresponding to this WIF (required since we can't derive pubkey without ECPair)
 * @param index - Optional account index (defaults to 0)
 * @returns BitcoinAccount instance
 *
 * @example
 * ```typescript
 * // When importing from WIF, you typically already know the address
 * const account = createBitcoinAccountFromWIF(
 *   BITCOIN_NETWORKS['bitcoin-mainnet'],
 *   'L1aW4aubDFB7yfras...',
 *   '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
 *   0
 * );
 * ```
 */
export function createBitcoinAccountFromWIF(
  network: BitcoinNetwork,
  wif: string,
  address: string,
  index: number = 0,
  apiFunctions: BitcoinAccountApiFunctions
): BitcoinAccount {
  // Validate that the address is valid for the network
  if (!BitcoinAccount.isValidAddress(address, network.config.network)) {
    throw new Error(`Invalid address for network: ${network.id}`);
  }

  // For WIF import without ECPair, we can't derive the public key
  // The caller must provide the address, and we store an empty public key
  // This is a limitation until proper ECPair support is added
  const keyPair: BitcoinKeyPair = {
    address,
    privateKeyWIF: wif,
    publicKey: new Uint8Array(33), // Empty placeholder - signing would need the actual key
  };

  return createBitcoinAccountFromKeyPair(network, keyPair, index, apiFunctions);
}
