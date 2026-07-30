/**
 * Mnemonic and HD wallet derivation utilities.
 *
 * This module provides functions for generating and validating BIP39 mnemonics,
 * and deriving cryptocurrency keypairs for Solana and Bitcoin using BIP44 paths.
 *
 * @module crypto/mnemonic
 */

import {
  generateMnemonic as scureGenerateMnemonic,
  validateMnemonic as scureValidateMnemonic,
  mnemonicToSeed as scureMnemonicToSeed,
} from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { BIP32Factory, type BIP32Interface } from 'bip32';
import * as ecc from '@bitcoinerlab/secp256k1';
import { createKeyPairSignerFromPrivateKeyBytes, type KeyPairSigner } from '@solana/kit';
import { sha256 } from '@noble/hashes/sha256';
import HDKey from 'micro-key-producer/slip10.js';
import { pbkdf2 } from './fastCrypto';

// Initialize BIP32 with secp256k1 elliptic curve implementation
const bip32 = BIP32Factory(ecc);

// ============================================================================
// Seed Cache
// ============================================================================

/**
 * In-memory cache for derived seeds.
 *
 * `mnemonicToSeed` runs PBKDF2-HMAC-SHA512 (2048 iterations). The default
 * `bip39` library uses a pure-JS implementation which is extremely slow on
 * Hermes (~1-5 s per call on mid-range Android).  Because the seed is
 * deterministic for a given (mnemonic, passphrase) pair, caching it avoids
 * redundant derivations during unlock / restore flows where the same
 * mnemonic is used to derive accounts on multiple networks.
 *
 * Call `clearSeedCache()` once the mnemonic is no longer needed in memory.
 */
const SEED_CACHE_TTL_MS = 30_000;

const seedCache = new Map<string, { seed: Buffer; expiresAt: number }>();

/**
 * In-flight promise deduplication.
 *
 * When multiple callers request the same seed concurrently (e.g. via
 * `Promise.all` in account-factory), only the first caller runs PBKDF2;
 * subsequent callers await the same promise instead of starting redundant
 * derivations.
 */
const inflightSeeds = new Map<string, Promise<Buffer>>();

function hashCacheKey(mnemonic: string, passphrase: string): string {
  const data = new TextEncoder().encode(`${mnemonic}\0${passphrase}`);
  return Buffer.from(sha256(data)).toString('hex');
}

/**
 * Clears the in-memory seed cache.
 * Call after unlock/restore completes to minimise sensitive data exposure.
 */
export function clearSeedCache(): void {
  seedCache.clear();
  inflightSeeds.clear();
}

/**
 * SLIP-0044 registered coin types for BIP-0044 derivation paths.
 * @see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 */
export const COIN_TYPES = {
  /** Bitcoin (BTC) coin type */
  BTC: 0,
  /** Bitcoin Testnet coin type */
  TESTNET: 1,
  /** Solana (SOL) coin type */
  SOL: 501,
} as const;

/**
 * Standard BIP44 derivation path for Solana.
 * Format: m/44'/501'/{account}'/0'
 *
 * @param accountIndex - The account index (default: 0)
 * @returns The full derivation path string
 */
export const SOLANA_PATH = (accountIndex: number = 0): string =>
  `m/44'/${COIN_TYPES.SOL}'/${accountIndex}'/0'`;

/**
 * Standard BIP44 derivation path for Bitcoin.
 * Format: m/44'/0'/{account}'/0/0
 *
 * @param accountIndex - The account index (default: 0)
 * @returns The full derivation path string
 */
export const BITCOIN_PATH = (accountIndex: number = 0): string =>
  `m/44'/${COIN_TYPES.BTC}'/${accountIndex}'/0/0`;

/**
 * Valid mnemonic strengths in bits.
 * - 128 bits = 12 words
 * - 160 bits = 15 words
 * - 192 bits = 18 words
 * - 224 bits = 21 words
 * - 256 bits = 24 words
 */
export type MnemonicStrength = 128 | 160 | 192 | 224 | 256;

/**
 * Result of a Bitcoin key derivation containing the BIP32 node.
 */
export interface BitcoinDerivedKey {
  /** The BIP32 node containing public/private key data */
  node: BIP32Interface;
  /** The derivation path used */
  path: string;
}

/**
 * Result of a Solana key derivation.
 */
export interface SolanaDerivedKey {
  /**
   * The 32-byte ed25519 seed. Retained because `signer`'s CryptoKey is created
   * non-extractable, so this is the only recoverable form of the private key.
   */
  seed: Uint8Array;
  /** Non-extractable kit signer. `signer.address` is the base58 public key. */
  signer: KeyPairSigner;
  /** The derivation path used */
  path: string;
}

/**
 * Generates a new BIP39 mnemonic phrase.
 *
 * @param strength - The entropy strength in bits (default: 128 = 12 words)
 * @returns A space-separated mnemonic phrase
 *
 * @example
 * ```typescript
 * // Generate a 12-word mnemonic (128 bits)
 * const mnemonic12 = generateMnemonic();
 *
 * // Generate a 24-word mnemonic (256 bits)
 * const mnemonic24 = generateMnemonic(256);
 * ```
 */
export function generateMnemonic(strength: MnemonicStrength = 128): string {
  return scureGenerateMnemonic(wordlist, strength);
}

/**
 * Validates a BIP39 mnemonic phrase.
 *
 * Checks that the mnemonic:
 * - Contains valid words from the BIP39 wordlist
 * - Has the correct word count (12, 15, 18, 21, or 24)
 * - Has a valid checksum
 *
 * @param mnemonic - The mnemonic phrase to validate
 * @returns True if the mnemonic is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = validateMnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
 * console.log(isValid); // true
 *
 * const isInvalid = validateMnemonic('invalid mnemonic phrase');
 * console.log(isInvalid); // false
 * ```
 */
export function validateMnemonic(mnemonic: string): boolean {
  return scureValidateMnemonic(mnemonic, wordlist);
}

/**
 * Converts a BIP39 mnemonic phrase to a seed buffer.
 *
 * The seed is derived using PBKDF2 with 2048 iterations of HMAC-SHA512.
 * This seed can then be used to derive HD wallet keys.
 *
 * @param mnemonic - The mnemonic phrase
 * @param passphrase - Optional BIP39 passphrase (default: empty string)
 * @returns A Promise resolving to a 64-byte seed Buffer
 * @throws Error if the mnemonic is invalid
 *
 * @example
 * ```typescript
 * const seed = await mnemonicToSeed('abandon abandon abandon ...');
 * console.log(seed.length); // 64
 * ```
 */
export async function mnemonicToSeed(
  mnemonic: string,
  passphrase: string = ''
): Promise<Buffer> {
  const cacheKey = hashCacheKey(mnemonic, passphrase);

  // 1. Return cached seed if not expired
  const cached = seedCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.seed;
  if (cached) seedCache.delete(cacheKey);

  // 2. Deduplicate concurrent calls (e.g. Promise.all in account-factory)
  const inflight = inflightSeeds.get(cacheKey);
  if (inflight) return inflight;

  // 3. Derive — only one caller reaches here per unique mnemonic
  const promise = deriveSeedInternal(mnemonic, passphrase);
  inflightSeeds.set(cacheKey, promise);

  try {
    const seed = await promise;
    seedCache.set(cacheKey, { seed, expiresAt: Date.now() + SEED_CACHE_TTL_MS });
    return seed;
  } finally {
    inflightSeeds.delete(cacheKey);
  }
}

/**
 * Internal: runs the actual PBKDF2 derivation.
 * Called only once per unique (mnemonic, passphrase) pair thanks to deduplication.
 */
async function deriveSeedInternal(
  mnemonic: string,
  passphrase: string
): Promise<Buffer> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid seed words');
  }

  // 1. Try react-native-fast-crypto native module (mobile APK)
  if (pbkdf2?.deriveAsync) {
    try {
      const passwordBytes = new TextEncoder().encode(mnemonic.normalize('NFKD'));
      const saltBytes = new TextEncoder().encode(
        ('mnemonic' + passphrase).normalize('NFKD')
      );
      const derived = await pbkdf2.deriveAsync(
        passwordBytes,
        saltBytes,
        2048,
        64,
        'sha512'
      );
      return Buffer.from(derived);
    } catch {
      // Native module unavailable — fall through
    }
  }

  // 2. Try Web Crypto API (browsers, extensions, some RN environments)
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      const passwordBytes = new TextEncoder().encode(mnemonic.normalize('NFKD'));
      const saltBytes = new TextEncoder().encode(
        ('mnemonic' + passphrase).normalize('NFKD')
      );
      const baseKey = await subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits']);
      const derived = await subtle.deriveBits(
        { name: 'PBKDF2', salt: saltBytes, iterations: 2048, hash: 'SHA-512' },
        baseKey,
        512 // 64 bytes in bits
      );
      return Buffer.from(derived);
    } catch {
      // Web Crypto unavailable for PBKDF2 — fall through
    }
  }

  // 3. Pure JS fallback via @scure/bip39 (@noble/hashes pbkdf2Async)
  const scureSeed = await scureMnemonicToSeed(mnemonic, passphrase);
  return Buffer.from(scureSeed);
}

/**
 * Derives a Solana Keypair from a mnemonic using ed25519 HD derivation.
 *
 * Uses micro-key-producer's SLIP-0010 implementation for compliant derivation,
 * which is the standard for Solana wallets (Phantom, Solflare, etc.).
 *
 * This library is:
 * - Browser/React Native compatible (no Node.js Buffer dependency)
 * - Uses audited @noble/ed25519 under the hood
 * - Based on audited code from scure-bip32
 *
 * @param mnemonic - The BIP39 mnemonic phrase
 * @param accountIndex - The account index for the derivation path (default: 0)
 * @returns A Promise resolving to the derived seed, kit signer and path
 * @throws Error if the mnemonic is invalid
 *
 * @example
 * ```typescript
 * const { signer, path } = await deriveSolanaKeypair(mnemonic);
 * console.log(signer.address);
 * console.log(path); // "m/44'/501'/0'/0'"
 *
 * // Derive second account
 * const { signer: signer2 } = await deriveSolanaKeypair(mnemonic, 1);
 * ```
 */
export async function deriveSolanaKeypair(
  mnemonic: string,
  accountIndex: number = 0
): Promise<SolanaDerivedKey> {
  const seed = await mnemonicToSeed(mnemonic);
  const path = SOLANA_PATH(accountIndex);
  const hdkey = HDKey.fromMasterSeed(seed);
  const derived = hdkey.derive(path);

  return {
    seed: derived.privateKey,
    signer: await createKeyPairSignerFromPrivateKeyBytes(derived.privateKey, false),
    path,
  };
}

/**
 * Derives a Bitcoin BIP32 node from a mnemonic using secp256k1 HD derivation.
 *
 * Returns a BIP32 node that can be used to generate Bitcoin addresses
 * and sign transactions. The node contains both public and private key data.
 *
 * @param mnemonic - The BIP39 mnemonic phrase
 * @param accountIndex - The account index for the derivation path (default: 0)
 * @returns A Promise resolving to the derived BIP32 node and path
 * @throws Error if the mnemonic is invalid
 *
 * @example
 * ```typescript
 * import * as bitcoin from 'bitcoinjs-lib';
 *
 * const { node, path } = await deriveBitcoinKeypair(mnemonic);
 *
 * // Get P2PKH address
 * const { address } = bitcoin.payments.p2pkh({
 *   pubkey: node.publicKey,
 *   network: bitcoin.networks.bitcoin,
 * });
 *
 * // Get WIF private key for signing
 * const wif = node.toWIF();
 * ```
 */
export async function deriveBitcoinKeypair(
  mnemonic: string,
  accountIndex: number = 0
): Promise<BitcoinDerivedKey> {
  const seed = await mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed);
  const path = BITCOIN_PATH(accountIndex);
  const node = root.derivePath(path);

  return { node, path };
}

/**
 * Derives a child BIP32 node from a mnemonic using a custom derivation path.
 *
 * This is a lower-level function for deriving keys with non-standard paths.
 * For standard Solana or Bitcoin derivation, use deriveSolanaKeypair or
 * deriveBitcoinKeypair instead.
 *
 * @param mnemonic - The BIP39 mnemonic phrase
 * @param path - The BIP32 derivation path (e.g., "m/44'/0'/0'/0/0")
 * @returns A Promise resolving to the derived BIP32 node
 * @throws Error if the mnemonic is invalid or path is malformed
 *
 * @example
 * ```typescript
 * // Custom derivation path
 * const node = await deriveChildFromPath(mnemonic, "m/44'/60'/0'/0/0");
 * ```
 */
export async function deriveChildFromPath(
  mnemonic: string,
  path: string
): Promise<BIP32Interface> {
  const seed = await mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed);
  return root.derivePath(path);
}

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalizes a mnemonic phrase for consistent validation and storage
 *
 * - Trims whitespace from start and end
 * - Converts to lowercase
 * - Replaces multiple spaces with single spaces
 *
 * @param phrase - The mnemonic phrase to normalize
 * @returns Normalized mnemonic phrase
 *
 * @example
 * normalizeMnemonic('  Apple  Banana   Cherry  ');
 * // Returns: 'apple banana cherry'
 */
export function normalizeMnemonic(phrase: string): string {
  return phrase
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Generates random word positions for seed phrase backup validation
 *
 * Distributes positions across thirds of the phrase to ensure user
 * has backed up the entire phrase, not just the beginning.
 *
 * @param wordCount - Total number of words in the mnemonic (12 or 24)
 * @param count - Number of positions to generate (default: 3)
 * @returns Array of 1-indexed word positions
 *
 * @example
 * generateValidationPositions(12, 3);
 * // Returns something like: [2, 6, 10] (one from each third)
 */
export function generateValidationPositions(
  wordCount: number,
  count: number = 3
): number[] {
  if (count > wordCount) {
    throw new Error('Count cannot exceed word count');
  }

  const positions: number[] = [];
  const sectionSize = Math.floor(wordCount / count);

  for (let i = 0; i < count; i++) {
    const sectionStart = i * sectionSize;
    const sectionEnd = (i + 1) * sectionSize;
    const range = sectionEnd - sectionStart;
    const randomBytes = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomBytes);
    const pos = (randomBytes[0] % range) + sectionStart + 1;
    positions.push(pos);
  }

  return positions;
}

/**
 * Validates that user-entered words match the original mnemonic
 *
 * @param mnemonic - The full mnemonic phrase
 * @param positions - Array of 1-indexed positions to check
 * @param userWords - Array of words entered by user (in same order as positions)
 * @returns Object with validation result and details
 *
 * @example
 * const result = validateMnemonicWords(
 *   'apple banana cherry date ...',
 *   [1, 3, 5],
 *   ['apple', 'cherry', 'elderberry']
 * );
 * // result.isValid = true if all match
 */
export function validateMnemonicWords(
  mnemonic: string,
  positions: number[],
  userWords: string[]
): {
  isValid: boolean;
  results: Array<{
    position: number;
    expected: string;
    entered: string;
    isCorrect: boolean;
  }>;
} {
  const words = normalizeMnemonic(mnemonic).split(' ');

  const results = positions.map((pos, index) => {
    const expected = words[pos - 1] || '';
    const entered = (userWords[index] || '').toLowerCase().trim();
    return {
      position: pos,
      expected,
      entered,
      isCorrect: expected === entered,
    };
  });

  return {
    isValid: results.every(r => r.isCorrect),
    results,
  };
}
