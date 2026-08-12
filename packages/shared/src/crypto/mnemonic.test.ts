/**
 * Tests for Mnemonic and HD wallet derivation utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  clearSeedCache,
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  deriveSolanaKeypair,
  deriveBitcoinKeypair,
  deriveChildFromPath,
  normalizeMnemonic,
  validateMnemonicWords,
  generateValidationPositions,
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

  it('skips Web Crypto when crypto.subtle has no deriveBits (Ed25519 polyfill)', async () => {
    // The Ed25519 polyfill mobile installs replaces crypto.subtle with an
    // object that has key/sign methods but no PBKDF2 support. Probing the
    // object instead of deriveBits made every derivation call importKey,
    // throw, and fall through — once per mnemonic derivation.
    clearSeedCache();
    const expected = (await mnemonicToSeed(VALID_MNEMONIC)).toString('hex');

    const importKey = vi.fn(() => {
      throw new TypeError('No native `importKey` function exists to handle this call');
    });
    const realSubtle = globalThis.crypto.subtle;
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: { importKey, sign: vi.fn(), verify: vi.fn() },
      configurable: true,
    });

    try {
      clearSeedCache();
      const seed = await mnemonicToSeed(VALID_MNEMONIC);

      expect(seed.toString('hex')).toBe(expected);
      expect(importKey).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis.crypto, 'subtle', {
        value: realSubtle,
        configurable: true,
      });
      clearSeedCache();
    }
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

    expect(Buffer.from(node0.publicKey).toString('hex')).not.toBe(
      Buffer.from(node1.publicKey).toString('hex')
    );
  });
});

// ============================================================================
// deriveChildFromPath Tests
// ============================================================================

describe('deriveChildFromPath', () => {
  it('should derive the pinned BIP32 node from a valid path', async () => {
    const path = "m/44'/60'/0'/0/0"; // Ethereum path
    const node = await deriveChildFromPath(VALID_MNEMONIC, path);

    // Pinned on 2026-08-12 by running this exact call against the well-known
    // BIP39 "abandon … about" test vector (a widely published public vector).
    // A change in seed derivation or BIP32 path handling must fail here.
    expect(Buffer.from(node.publicKey).toString('hex')).toBe(
      '0237b0bb7a8288d38ed49a524b5dc98cff3eb5ca824c9f9dc0dfdb3d9cd600f299'
    );
    expect(node.privateKey?.length).toBe(32);
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

// ============================================================================
// normalizeMnemonic Tests (spec 009, US5 — recover-flow input hygiene)
// ============================================================================

describe('normalizeMnemonic', () => {
  it('normalizes mixed case, extra spaces, and newlines to the canonical form', () => {
    const messy =
      '  Abandon ABANDON\tabandon\n abandon  abandon abandon\nabandon abandon   abandon abandon abandon ABOUT \n';

    const normalized = normalizeMnemonic(messy);

    expect(normalized).toBe(VALID_MNEMONIC);
    expect(validateMnemonic(normalized)).toBe(true);
  });

  it('leaves an already-canonical mnemonic unchanged', () => {
    expect(normalizeMnemonic(VALID_MNEMONIC)).toBe(VALID_MNEMONIC);
  });

  it('collapses internal runs of whitespace to single spaces', () => {
    expect(normalizeMnemonic('apple   banana \t cherry')).toBe('apple banana cherry');
  });
});

// ============================================================================
// validateMnemonicWords Tests (spec 009, US5)
// ============================================================================

describe('validateMnemonicWords', () => {
  it('returns isValid true when all entered words match', () => {
    const result = validateMnemonicWords(
      VALID_MNEMONIC,
      [1, 6, 12],
      ['abandon', 'abandon', 'about']
    );

    expect(result.isValid).toBe(true);
    expect(result.results).toHaveLength(3);
    expect(result.results.every((r) => r.isCorrect)).toBe(true);
  });

  it('identifies exactly which position holds the wrong word', () => {
    const result = validateMnemonicWords(
      VALID_MNEMONIC,
      [1, 6, 12],
      [
        'abandon',
        'banana', // wrong
        'about',
      ]
    );

    expect(result.isValid).toBe(false);
    const wrong = result.results.filter((r) => !r.isCorrect);
    expect(wrong).toHaveLength(1);
    expect(wrong[0]).toEqual({
      position: 6,
      expected: 'abandon',
      entered: 'banana',
      isCorrect: false,
    });
  });

  it('tolerates case and surrounding whitespace in entered words', () => {
    const result = validateMnemonicWords(VALID_MNEMONIC, [12], ['  ABOUT ']);
    expect(result.isValid).toBe(true);
  });

  it('treats missing entries as incorrect, not as a crash', () => {
    const result = validateMnemonicWords(VALID_MNEMONIC, [1, 12], ['abandon']);
    expect(result.isValid).toBe(false);
    expect(result.results[1]).toMatchObject({ entered: '', isCorrect: false });
  });
});

// ============================================================================
// generateValidationPositions Tests (spec 009, US5)
// ============================================================================

describe('generateValidationPositions', () => {
  it('returns unique, in-range, strictly increasing positions spread across sections', () => {
    // Randomized output — run repeatedly to cover the range without real sleeps.
    for (let run = 0; run < 50; run++) {
      const positions = generateValidationPositions(12, 3);

      expect(positions).toHaveLength(3);
      expect(new Set(positions).size).toBe(3);
      positions.forEach((pos, i) => {
        // One position per third: section i covers [i*4 + 1, (i+1)*4]
        expect(pos).toBeGreaterThanOrEqual(i * 4 + 1);
        expect(pos).toBeLessThanOrEqual((i + 1) * 4);
      });
    }
  });

  it('supports 24-word mnemonics', () => {
    for (let run = 0; run < 50; run++) {
      const positions = generateValidationPositions(24, 3);
      expect(positions).toHaveLength(3);
      expect(new Set(positions).size).toBe(3);
      positions.forEach((pos, i) => {
        expect(pos).toBeGreaterThanOrEqual(i * 8 + 1);
        expect(pos).toBeLessThanOrEqual((i + 1) * 8);
      });
    }
  });

  it('defaults to 3 positions', () => {
    expect(generateValidationPositions(12)).toHaveLength(3);
  });

  it('throws when count exceeds word count', () => {
    expect(() => generateValidationPositions(3, 4)).toThrow('Count cannot exceed word count');
  });
});
