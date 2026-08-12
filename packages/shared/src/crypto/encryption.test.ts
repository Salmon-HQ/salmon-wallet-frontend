/**
 * Tests for Encryption module
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

// Mock react-native-fast-crypto to force fallback to crypto-js
vi.mock('react-native-fast-crypto', () => ({
  pbkdf2: null, // Force fallback to crypto-js
}));

import bs58 from 'bs58';
import { randomBytes } from 'tweetnacl';
import {
  deriveEncryptionKey,
  lock,
  lockAndGetKey,
  unlock,
  unlockAndGetKey,
  unlockWithKey,
  lockWithKey,
  isValidVault,
  isKeyCacheValid,
  refreshCachedKey,
  KEY_CACHE_TTL,
  DEFAULT_ITERATIONS,
  DEFAULT_DIGEST,
  IncorrectPasswordError,
  InvalidVaultError,
  KeyDerivationError,
  type DerivedKeyCache,
  type LockedVault,
} from './encryption';

// ============================================================================
// Test Data
// ============================================================================

const TEST_PASSWORD = 'testPassword123!';
const TEST_DATA = { secret: 'my-secret-value', key: 12345 };

// Use lower iterations for faster tests
const TEST_OPTIONS = { iterations: 1000 };

/**
 * Well-known BIP39 test vector mnemonic — public knowledge, never a real secret.
 */
const VALID_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

/** Password used to generate the committed golden fixtures below. */
const GOLDEN_PASSWORD = 'correct horse battery staple';

/**
 * GOLDEN VAULT FIXTURE — pins the persisted vault format.
 *
 * Generated once on 2026-08-12 by running the real implementation:
 *   await lock({ mnemonics: [VALID_MNEMONIC] }, GOLDEN_PASSWORD)
 * with production-default options (DEFAULT_ITERATIONS = 220000, sha512),
 * then committing the result verbatim. It is NEVER regenerated at test time.
 *
 * If any KDF parameter, cipher, or serialization detail changes, the golden
 * unlock test below fails — that is the point: an existing user's stored
 * vault must keep opening after refactors.
 */
const GOLDEN_VAULT: LockedVault = {
  encrypted:
    '2ybp9KcaUm3aqMmfbNVUD15C47JoAbYpxjr4cs2bjKRGJm6Ln7GpzGaWsg72CKBoHHcX4TMhV68jAqnkfvd4u9R1dWbfEjs2uhXsMdu59tKUR4SfMqZ5XYzXUN95jmvwUbDh5ZQ3HnsYghsdbYxmWz77P7ZgXYy6fkiL4s7eRQ7HqV',
  nonce: 'ATzfjcz3E6JyWgXZVZjCMjbfZs6BCz6M1',
  salt: 'FBYEzJDwv76BSLWyVibgUB',
  iterations: 220000,
  digest: 'sha512',
  kdf: 'pbkdf2',
};

/**
 * FAST VAULT FIXTURE — same content and password as GOLDEN_VAULT but locked
 * with only 1000 PBKDF2 iterations, so tamper tests (which each re-derive the
 * key) stay fast. Generated the same way on 2026-08-12:
 *   await lock({ mnemonics: [VALID_MNEMONIC] }, GOLDEN_PASSWORD, { iterations: 1000 })
 */
const FAST_VAULT: LockedVault = {
  encrypted:
    '6tbtZN3Z56qGsRBS84GTpRYgdF2L7EW4KRfwmGJUjjQmSbQjeLi3RekPuZ6zq5HgTBFTzJaNDzPdXSUdb8WQy3VT5ZXfCdqty1jjZEQr7TmVx1auYZ4BV3vzuVeKRSAviVnSv8LLR6TpNuNjLiZvYv6HA43QLteENRDfxyLdRu3wcx',
  nonce: '9ZyAuatuqdWkufegnoKPpfoSquooo9YSc',
  salt: 'TK85K8qijf11hxGG5p8bbt',
  iterations: 1000,
  digest: 'sha512',
  kdf: 'pbkdf2',
};

const GOLDEN_CONTENT = { mnemonics: [VALID_MNEMONIC] };

/**
 * Returns a copy of the vault with one byte flipped inside the given
 * base58-encoded field (decode → XOR one byte → re-encode).
 */
function flipByte(vault: LockedVault, field: 'encrypted' | 'nonce' | 'salt'): LockedVault {
  const bytes = bs58.decode(vault[field]);
  const tampered = Uint8Array.from(bytes);
  tampered[0] ^= 0x01;
  return { ...vault, [field]: bs58.encode(tampered) };
}

// ============================================================================
// Tests
// ============================================================================

describe('Encryption Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Error Classes
  // ==========================================================================

  describe('IncorrectPasswordError', () => {
    it('should create error with default message', () => {
      const error = new IncorrectPasswordError();
      expect(error.message).toBe('Incorrect password');
      expect(error.name).toBe('IncorrectPasswordError');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof IncorrectPasswordError).toBe(true);
    });

    it('should create error with custom message', () => {
      const error = new IncorrectPasswordError('Custom password error');
      expect(error.message).toBe('Custom password error');
      expect(error.name).toBe('IncorrectPasswordError');
    });
  });

  describe('InvalidVaultError', () => {
    it('should create error with default message', () => {
      const error = new InvalidVaultError();
      expect(error.message).toBe('Invalid vault data');
      expect(error.name).toBe('InvalidVaultError');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof InvalidVaultError).toBe(true);
    });

    it('should create error with custom message', () => {
      const error = new InvalidVaultError('Custom vault error');
      expect(error.message).toBe('Custom vault error');
      expect(error.name).toBe('InvalidVaultError');
    });
  });

  describe('KeyDerivationError', () => {
    it('should create error with default message', () => {
      const error = new KeyDerivationError();
      expect(error.message).toBe('Key derivation failed');
      expect(error.name).toBe('KeyDerivationError');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof KeyDerivationError).toBe(true);
    });

    it('should create error with custom message', () => {
      const error = new KeyDerivationError('Custom derivation error');
      expect(error.message).toBe('Custom derivation error');
      expect(error.name).toBe('KeyDerivationError');
    });
  });

  // ==========================================================================
  // deriveEncryptionKey
  // ==========================================================================

  describe('deriveEncryptionKey', () => {
    it('should derive a valid 32-byte encryption key with valid parameters', async () => {
      const salt = randomBytes(16);
      const key = await deriveEncryptionKey(TEST_PASSWORD, salt, 1000, 'sha256');

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32); // NaCl secretbox key length
    });

    it('should derive different keys for different passwords', async () => {
      const salt = randomBytes(16);
      const key1 = await deriveEncryptionKey('password1', salt, 1000, 'sha256');
      const key2 = await deriveEncryptionKey('password2', salt, 1000, 'sha256');

      // Keys should be different for different passwords
      expect(Buffer.from(key1).toString('hex')).not.toBe(Buffer.from(key2).toString('hex'));
    });

    it('skips Web Crypto when crypto.subtle has no deriveBits (Ed25519 polyfill)', async () => {
      // The Ed25519 polyfill mobile installs replaces crypto.subtle with an
      // object that has key/sign methods but no PBKDF2 support. Probing the
      // object instead of deriveBits made every derivation call importKey,
      // throw, and fall through — once per unlock.
      const importKey = vi.fn(() => {
        throw new TypeError('No native `importKey` function exists to handle this call');
      });
      const realSubtle = globalThis.crypto.subtle;
      Object.defineProperty(globalThis.crypto, 'subtle', {
        value: { importKey, sign: vi.fn(), verify: vi.fn() },
        configurable: true,
      });

      try {
        const salt = randomBytes(16);
        const key = await deriveEncryptionKey(TEST_PASSWORD, salt, 1000, 'sha256');

        expect(key.length).toBe(32);
        expect(importKey).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(globalThis.crypto, 'subtle', {
          value: realSubtle,
          configurable: true,
        });
      }
    });
  });

  // ==========================================================================
  // lock
  // ==========================================================================

  describe('lock', () => {
    it('should successfully encrypt data and return valid vault structure', async () => {
      const vault = await lock(TEST_DATA, TEST_PASSWORD, TEST_OPTIONS);

      expect(vault).toHaveProperty('encrypted');
      expect(vault).toHaveProperty('nonce');
      expect(vault).toHaveProperty('salt');
      expect(vault).toHaveProperty('iterations');
      expect(vault).toHaveProperty('digest');
      expect(vault).toHaveProperty('kdf');

      expect(typeof vault.encrypted).toBe('string');
      expect(typeof vault.nonce).toBe('string');
      expect(typeof vault.salt).toBe('string');
      expect(vault.iterations).toBe(1000);
      expect(vault.digest).toBe('sha512');
      expect(vault.kdf).toBe('pbkdf2');
    });

    it('should produce different ciphertexts for same data (due to random salt/nonce)', async () => {
      const vault1 = await lock(TEST_DATA, TEST_PASSWORD, TEST_OPTIONS);
      const vault2 = await lock(TEST_DATA, TEST_PASSWORD, TEST_OPTIONS);

      // Each encryption should produce different results due to random salt/nonce
      expect(vault1.encrypted).not.toBe(vault2.encrypted);
      expect(vault1.nonce).not.toBe(vault2.nonce);
      expect(vault1.salt).not.toBe(vault2.salt);
    });
  });

  // ==========================================================================
  // unlock
  // ==========================================================================

  describe('unlock', () => {
    it('should successfully decrypt data with correct password', async () => {
      const vault = await lock(TEST_DATA, TEST_PASSWORD, TEST_OPTIONS);
      const decrypted = await unlock<typeof TEST_DATA>(vault, TEST_PASSWORD);

      expect(decrypted).toEqual(TEST_DATA);
    });

    it('should throw IncorrectPasswordError with wrong password', async () => {
      const vault = await lock(TEST_DATA, TEST_PASSWORD, TEST_OPTIONS);

      await expect(unlock(vault, 'wrongPassword')).rejects.toThrow(IncorrectPasswordError);
    });
  });

  // ==========================================================================
  // isValidVault
  // ==========================================================================

  describe('isValidVault', () => {
    it('should return true for a valid vault structure', async () => {
      const vault = await lock(TEST_DATA, TEST_PASSWORD, TEST_OPTIONS);
      expect(isValidVault(vault)).toBe(true);
    });

    it('should return false for invalid vault structures', () => {
      // Test various invalid vault structures
      expect(isValidVault(null)).toBe(false);
      expect(isValidVault(undefined)).toBe(false);
      expect(isValidVault({})).toBe(false);
      expect(isValidVault({ encrypted: 'test' })).toBe(false);
      expect(
        isValidVault({
          encrypted: 'test',
          nonce: 'test',
          salt: 'test',
          iterations: 100000,
          digest: 'sha256',
          kdf: 'invalid-kdf',
        })
      ).toBe(false);
      expect(
        isValidVault({
          encrypted: 'test',
          nonce: 'test',
          salt: 'test',
          iterations: 0, // Invalid: must be > 0
          digest: 'sha256',
          kdf: 'pbkdf2',
        })
      ).toBe(false);
    });
  });

  describe('isKeyCacheValid', () => {
    const baseKey: DerivedKeyCache = {
      key: [1, 2, 3, 4],
      salt: 's',
      iterations: 1000,
      digest: 'sha256',
      expiresAt: 0,
    };

    it('returns false for null or undefined caches', () => {
      expect(isKeyCacheValid(null)).toBe(false);
      expect(isKeyCacheValid(undefined)).toBe(false);
    });

    it('returns false when expiresAt is in the past', () => {
      expect(isKeyCacheValid({ ...baseKey, expiresAt: Date.now() - 1 })).toBe(false);
    });

    it('returns true when expiresAt is in the future', () => {
      expect(isKeyCacheValid({ ...baseKey, expiresAt: Date.now() + 1000 })).toBe(true);
    });
  });

  describe('refreshCachedKey', () => {
    const baseKey: DerivedKeyCache = {
      key: [1, 2, 3, 4],
      salt: 's',
      iterations: 1000,
      digest: 'sha256',
      expiresAt: Date.now() - 1000,
    };

    it('returns a new cache with expiresAt = now + KEY_CACHE_TTL', () => {
      const before = Date.now();
      const refreshed = refreshCachedKey(baseKey);
      const after = Date.now();

      expect(refreshed.expiresAt).toBeGreaterThanOrEqual(before + KEY_CACHE_TTL);
      expect(refreshed.expiresAt).toBeLessThanOrEqual(after + KEY_CACHE_TTL);
    });

    it('does not mutate the original cache', () => {
      const original: DerivedKeyCache = { ...baseKey };
      const originalExpiresAt = original.expiresAt;
      refreshCachedKey(original);
      expect(original.expiresAt).toBe(originalExpiresAt);
    });

    it('preserves key material (key, salt, iterations, digest)', () => {
      const refreshed = refreshCachedKey(baseKey);
      expect(refreshed.key).toBe(baseKey.key);
      expect(refreshed.salt).toBe(baseKey.salt);
      expect(refreshed.iterations).toBe(baseKey.iterations);
      expect(refreshed.digest).toBe(baseKey.digest);
    });

    it('produces a valid cache (isKeyCacheValid returns true after refresh)', () => {
      const expired: DerivedKeyCache = {
        key: [1, 2, 3, 4],
        salt: 's',
        iterations: 1000,
        digest: 'sha256',
        expiresAt: Date.now() - 10_000,
      };
      expect(isKeyCacheValid(expired)).toBe(false);
      expect(isKeyCacheValid(refreshCachedKey(expired))).toBe(true);
    });
  });

  // ==========================================================================
  // Golden vault — pins KDF params + persisted format (spec 009, US1)
  // ==========================================================================

  describe('golden vault fixture', () => {
    it('pins the production KDF defaults', () => {
      // The golden fixture was generated with these exact defaults. If either
      // constant drifts, newly created vaults would diverge from the format
      // this suite proves decryptable — fail loudly here.
      expect(DEFAULT_ITERATIONS).toBe(220000);
      expect(DEFAULT_DIGEST).toBe('sha512');
      expect(GOLDEN_VAULT.iterations).toBe(DEFAULT_ITERATIONS);
      expect(GOLDEN_VAULT.digest).toBe(DEFAULT_DIGEST);
      expect(isValidVault(GOLDEN_VAULT)).toBe(true);
    });

    it('unlocks the committed golden vault to the exact expected mnemonics', async () => {
      const data = await unlock<typeof GOLDEN_CONTENT>(GOLDEN_VAULT, GOLDEN_PASSWORD);
      expect(data).toEqual(GOLDEN_CONTENT);
    });

    it('unlocks the committed fast fixture (1000 iterations) identically', async () => {
      const data = await unlock<typeof GOLDEN_CONTENT>(FAST_VAULT, GOLDEN_PASSWORD);
      expect(data).toEqual(GOLDEN_CONTENT);
    });
  });

  // ==========================================================================
  // Tampered vault fails closed (spec 009, US2)
  // ==========================================================================

  describe('tampered vault fails closed', () => {
    it('throws IncorrectPasswordError when one ciphertext byte is flipped', async () => {
      const tampered = flipByte(FAST_VAULT, 'encrypted');
      await expect(unlock(tampered, GOLDEN_PASSWORD)).rejects.toThrow(IncorrectPasswordError);
    });

    it('throws IncorrectPasswordError when one nonce byte is flipped', async () => {
      const tampered = flipByte(FAST_VAULT, 'nonce');
      await expect(unlock(tampered, GOLDEN_PASSWORD)).rejects.toThrow(IncorrectPasswordError);
    });

    it('throws IncorrectPasswordError when one salt byte is flipped', async () => {
      const tampered = flipByte(FAST_VAULT, 'salt');
      await expect(unlock(tampered, GOLDEN_PASSWORD)).rejects.toThrow(IncorrectPasswordError);
    });

    it('throws InvalidVaultError for structurally broken vaults', async () => {
      await expect(
        unlock({ ...FAST_VAULT, encrypted: undefined } as unknown as LockedVault, GOLDEN_PASSWORD)
      ).rejects.toThrow(InvalidVaultError);
      await expect(
        unlock({ ...FAST_VAULT, digest: 'md5' } as unknown as LockedVault, GOLDEN_PASSWORD)
      ).rejects.toThrow(InvalidVaultError);
    });
  });

  // ==========================================================================
  // Key-cache unlock path, executed for real (spec 009, US3)
  // ==========================================================================

  describe('key-cache path (unlockAndGetKey / unlockWithKey / lockWithKey)', () => {
    // Derive once and reuse — these tests only read the vault/keyCache.
    let vault: LockedVault;
    let keyCache: DerivedKeyCache;

    beforeAll(async () => {
      vault = await lock(TEST_DATA, TEST_PASSWORD, TEST_OPTIONS);
      const result = await unlockAndGetKey<typeof TEST_DATA>(vault, TEST_PASSWORD);
      keyCache = result.keyCache;
    });

    it('unlockAndGetKey returns the data and a key cache matching the vault', async () => {
      const before = Date.now();
      const { data, keyCache: fresh } = await unlockAndGetKey<typeof TEST_DATA>(
        vault,
        TEST_PASSWORD
      );

      expect(data).toEqual(TEST_DATA);
      expect(fresh.salt).toBe(vault.salt);
      expect(fresh.iterations).toBe(vault.iterations);
      expect(fresh.digest).toBe(vault.digest);
      expect(fresh.key).toHaveLength(32);
      expect(fresh.expiresAt).toBeGreaterThanOrEqual(before + KEY_CACHE_TTL);
    });

    it('unlockAndGetKey throws IncorrectPasswordError for a wrong password', async () => {
      await expect(unlockAndGetKey(vault, 'wrongPassword')).rejects.toThrow(IncorrectPasswordError);
    });

    it('unlockWithKey decrypts the vault using the cached key, no password needed', () => {
      const data = unlockWithKey<typeof TEST_DATA>(vault, keyCache);
      expect(data).toEqual(TEST_DATA);
    });

    it('unlockWithKey throws when the key comes from a different vault (salt mismatch)', async () => {
      const { keyCache: otherKey } = await lockAndGetKey(TEST_DATA, TEST_PASSWORD, TEST_OPTIONS);
      expect(otherKey.salt).not.toBe(vault.salt);
      expect(() => unlockWithKey(vault, otherKey)).toThrow(IncorrectPasswordError);
    });

    it('unlockWithKey throws when key bytes are wrong even with a matching salt', () => {
      const wrongKey: DerivedKeyCache = {
        ...keyCache,
        key: keyCache.key.map((b) => b ^ 0xff),
      };
      expect(() => unlockWithKey(vault, wrongKey)).toThrow(IncorrectPasswordError);
    });

    it('unlockWithKey throws InvalidVaultError for a structurally broken vault', () => {
      expect(() =>
        unlockWithKey({ ...vault, nonce: 42 } as unknown as LockedVault, keyCache)
      ).toThrow(InvalidVaultError);
    });

    it('lockWithKey re-encrypts with a fresh nonce and round-trips via the password', async () => {
      const newData = { secret: 'rotated-value', key: 999 };
      const relocked = lockWithKey(newData, keyCache);

      expect(relocked.salt).toBe(keyCache.salt);
      expect(relocked.iterations).toBe(keyCache.iterations);
      expect(relocked.digest).toBe(keyCache.digest);
      expect(relocked.nonce).not.toBe(vault.nonce); // CRITICAL: nonce must be fresh

      const viaPassword = await unlock<typeof newData>(relocked, TEST_PASSWORD);
      expect(viaPassword).toEqual(newData);
      // And the cached key still opens it (same salt, same derived key)
      expect(unlockWithKey<typeof newData>(relocked, keyCache)).toEqual(newData);
    });

    it('lockAndGetKey returns a vault/keyCache pair that unlockWithKey accepts', async () => {
      const { vault: freshVault, keyCache: freshKey } = await lockAndGetKey(
        TEST_DATA,
        TEST_PASSWORD,
        TEST_OPTIONS
      );
      expect(unlockWithKey<typeof TEST_DATA>(freshVault, freshKey)).toEqual(TEST_DATA);
    });
  });
});
