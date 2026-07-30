/**
 * Tests for Mnemonic and HD wallet derivation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  deriveSolanaKeypair,
  deriveBitcoinKeypair,
  deriveChildFromPath,
  SOLANA_PATH,
  BITCOIN_PATH,
  COIN_TYPES,
} from './mnemonic';

// ============================================================================
// Test Data
// ============================================================================

/**
 * Valid 12-word test mnemonic (BIP39 test vector)
 * This is a well-known test mnemonic - DO NOT use for real funds
 */
const VALID_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

/**
 * Solana address derived from VALID_MNEMONIC at m/44'/501'/0'/0'.
 * Pinned so a change in the derivation or signer construction is caught here.
 */
const EXPECTED_SOLANA_ADDRESS_INDEX_0 = 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk';

/**
 * Invalid mnemonic phrases for testing
 */
const INVALID_MNEMONIC = 'invalid mnemonic phrase that should fail validation';
const INVALID_MNEMONIC_WRONG_CHECKSUM =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';

// ============================================================================
// generateMnemonic Tests
// ============================================================================

describe('generateMnemonic', () => {
  it('should generate a valid 12-word mnemonic with default strength (128 bits)', () => {
    const mnemonic = generateMnemonic();
    const words = mnemonic.split(' ');

    expect(words.length).toBe(12);
    expect(validateMnemonic(mnemonic)).toBe(true);
  });

  it('should generate a valid 24-word mnemonic with 256-bit strength', () => {
    const mnemonic = generateMnemonic(256);
    const words = mnemonic.split(' ');

    expect(words.length).toBe(24);
    expect(validateMnemonic(mnemonic)).toBe(true);
  });

  it('should throw an error for invalid strength value', () => {
    // TypeScript prevents this at compile time, but test runtime behavior
    // @ts-expect-error - Testing invalid input
    expect(() => generateMnemonic(100)).toThrow();
  });
});

// ============================================================================
// validateMnemonic Tests
// ============================================================================

describe('validateMnemonic', () => {
  it('should return true for a valid mnemonic', () => {
    const result = validateMnemonic(VALID_MNEMONIC);

    expect(result).toBe(true);
  });

  it('should return false for an invalid mnemonic', () => {
    const result = validateMnemonic(INVALID_MNEMONIC);

    expect(result).toBe(false);
  });

  it('should return false for mnemonic with invalid checksum', () => {
    const result = validateMnemonic(INVALID_MNEMONIC_WRONG_CHECKSUM);

    expect(result).toBe(false);
  });
});

// ============================================================================
// mnemonicToSeed Tests
// ============================================================================

describe('mnemonicToSeed', () => {
  it('should convert a valid mnemonic to a 64-byte seed', async () => {
    const seed = await mnemonicToSeed(VALID_MNEMONIC);

    expect(seed).toBeInstanceOf(Buffer);
    expect(seed.length).toBe(64);
  });

  it('should throw an error for an invalid mnemonic', async () => {
    await expect(mnemonicToSeed(INVALID_MNEMONIC)).rejects.toThrow('Invalid seed words');
  });

  it('should produce different seeds with different passphrases', async () => {
    const seed1 = await mnemonicToSeed(VALID_MNEMONIC, '');
    const seed2 = await mnemonicToSeed(VALID_MNEMONIC, 'password');

    expect(seed1.toString('hex')).not.toBe(seed2.toString('hex'));
  });
});

// ============================================================================
// deriveSolanaKeypair Tests
// ============================================================================

describe('deriveSolanaKeypair', () => {
  it('should derive a valid Solana keypair from mnemonic', async () => {
    const { seed, signer, path } = await deriveSolanaKeypair(VALID_MNEMONIC);

    expect(seed).toBeInstanceOf(Uint8Array);
    expect(seed.length).toBe(32);
    expect(signer.address).toBe(EXPECTED_SOLANA_ADDRESS_INDEX_0);
    expect(path).toBe("m/44'/501'/0'/0'");
  });

  it('should throw an error for an invalid mnemonic', async () => {
    await expect(deriveSolanaKeypair(INVALID_MNEMONIC)).rejects.toThrow('Invalid seed words');
  });

  it('should derive different keypairs for different account indices', async () => {
    const { signer: signer0 } = await deriveSolanaKeypair(VALID_MNEMONIC, 0);
    const { signer: signer1 } = await deriveSolanaKeypair(VALID_MNEMONIC, 1);

    expect(signer0.address).not.toBe(signer1.address);
  });
});

// ============================================================================
// deriveBitcoinKeypair Tests
// ============================================================================

describe('deriveBitcoinKeypair', () => {
  it('should derive a valid Bitcoin BIP32 node from mnemonic', async () => {
    const { node, path } = await deriveBitcoinKeypair(VALID_MNEMONIC);

    expect(node).toBeDefined();
    expect(node.publicKey).toBeDefined();
    expect(node.privateKey).toBeDefined();
    expect(node.publicKey.length).toBe(33); // Compressed public key
    expect(node.privateKey?.length).toBe(32);
    expect(path).toBe("m/44'/0'/0'/0/0");
  });

  it('should throw an error for an invalid mnemonic', async () => {
    await expect(deriveBitcoinKeypair(INVALID_MNEMONIC)).rejects.toThrow('Invalid seed words');
  });

  it('should derive different nodes for different account indices', async () => {
    const { node: node0 } = await deriveBitcoinKeypair(VALID_MNEMONIC, 0);
    const { node: node1 } = await deriveBitcoinKeypair(VALID_MNEMONIC, 1);

    expect(Buffer.from(node0.publicKey).toString('hex')).not.toBe(Buffer.from(node1.publicKey).toString('hex'));
  });
});

// ============================================================================
// deriveChildFromPath Tests
// ============================================================================

describe('deriveChildFromPath', () => {
  it('should derive a BIP32 node from a valid path', async () => {
    const path = "m/44'/60'/0'/0/0"; // Ethereum path
    const node = await deriveChildFromPath(VALID_MNEMONIC, path);

    expect(node).toBeDefined();
    expect(node.publicKey).toBeDefined();
    expect(node.privateKey).toBeDefined();
  });

  it('should throw an error for an invalid path', async () => {
    const invalidPath = 'invalid/path/format';

    await expect(deriveChildFromPath(VALID_MNEMONIC, invalidPath)).rejects.toThrow();
  });

  it('should throw an error for an invalid mnemonic', async () => {
    const path = "m/44'/0'/0'/0/0";

    await expect(deriveChildFromPath(INVALID_MNEMONIC, path)).rejects.toThrow('Invalid seed words');
  });
});

// ============================================================================
// SOLANA_PATH Tests
// ============================================================================

describe('SOLANA_PATH', () => {
  it('should return correct path with default index (0)', () => {
    const path = SOLANA_PATH();

    expect(path).toBe(`m/44'/${COIN_TYPES.SOL}'/0'/0'`);
    expect(path).toBe("m/44'/501'/0'/0'");
  });

  it('should return correct path with custom index', () => {
    const path = SOLANA_PATH(5);

    expect(path).toBe(`m/44'/${COIN_TYPES.SOL}'/5'/0'`);
    expect(path).toBe("m/44'/501'/5'/0'");
  });
});

// ============================================================================
// BITCOIN_PATH Tests
// ============================================================================

describe('BITCOIN_PATH', () => {
  it('should return correct path with default index (0)', () => {
    const path = BITCOIN_PATH();

    expect(path).toBe(`m/44'/${COIN_TYPES.BTC}'/0'/0/0`);
    expect(path).toBe("m/44'/0'/0'/0/0");
  });

  it('should return correct path with custom index', () => {
    const path = BITCOIN_PATH(3);

    expect(path).toBe(`m/44'/${COIN_TYPES.BTC}'/3'/0/0`);
    expect(path).toBe("m/44'/0'/3'/0/0");
  });
});

// ============================================================================
// COIN_TYPES Constants Tests
// ============================================================================

describe('COIN_TYPES', () => {
  it('should have correct BIP44 coin type values', () => {
    expect(COIN_TYPES.BTC).toBe(0);
    expect(COIN_TYPES.TESTNET).toBe(1);
    expect(COIN_TYPES.SOL).toBe(501);
  });
});
