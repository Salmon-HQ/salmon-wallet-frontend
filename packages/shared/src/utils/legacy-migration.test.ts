/**
 * Tests for migrateLegacyWallets (spec 012, US4.1).
 *
 * Focus: the password-protected silver path re-encrypts the migrated mnemonics
 * to the current KDF defaults and preserves them (round-trip). Storage I/O is
 * mocked; real crypto (lock/unlock) runs so the round-trip is genuine.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lock, unlock, DEFAULT_ITERATIONS, DEFAULT_DIGEST } from '../crypto/encryption';

// Keep STORAGE_KEYS and everything else real; only intercept the I/O.
vi.mock('../storage', async (importActual) => {
  const actual = await importActual<typeof import('../storage')>();
  return {
    ...actual,
    getStorageItem: vi.fn(),
    setStorageItem: vi.fn(),
    removeStorageItem: vi.fn(),
  };
});

import { migrateLegacyWallets, type MigrationDeps } from './legacy-migration';
import * as storage from '../storage';
import { STORAGE_KEYS } from '../storage';

const PASSWORD = 'correct horse battery staple';
const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const ADDRESS = 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk';

const mockGet = vi.mocked(storage.getStorageItem);
const mockSet = vi.mocked(storage.setStorageItem);
const mockRemove = vi.mocked(storage.removeStorageItem);

/** Minimal deps: restoreAccount returns a fixed account, no real derivation. */
function makeDeps(): MigrationDeps {
  return {
    restoreAccount: vi.fn(async () => ({
      id: 'acc-1',
      pathIndexes: { 'solana-mainnet': [0] },
      networksAccounts: {},
    })) as unknown as MigrationDeps['restoreAccount'],
    formatAccountForStorage: vi.fn(
      (account) => account
    ) as MigrationDeps['formatAccountForStorage'],
  };
}

describe('migrateLegacyWallets — password-protected path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('re-encrypts migrated mnemonics to current defaults and preserves them (round-trip)', async () => {
    // Legacy v2 "new format": mnemonics stored as a separate encrypted vault.
    const encryptedMnemonics = await lock({ [ADDRESS]: MNEMONIC }, PASSWORD);
    const legacy = {
      passwordRequired: true,
      wallets: [{ address: ADDRESS, path: "m/44'/501'/0'/0'", chain: 'solana' }],
      mnemonics: encryptedMnemonics,
      lastNumber: 3,
    };

    mockGet.mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.WALLETS) return legacy as never;
      return null as never;
    });

    const result = await migrateLegacyWallets(makeDeps(), PASSWORD);

    expect(result.status).toBe('migrated');

    // The migrated mnemonics vault is persisted under MNEMONICS, encrypted.
    const mnemonicsCall = mockSet.mock.calls.find(([key]) => key === STORAGE_KEYS.MNEMONICS);
    expect(mnemonicsCall).toBeDefined();
    const storedVault = mnemonicsCall![1] as {
      isEncrypted: boolean;
      iterations: number;
      digest: string;
    };

    // Re-encrypted to CURRENT defaults (not whatever the legacy vault used).
    expect(storedVault.isEncrypted).toBe(true);
    expect(storedVault.iterations).toBe(DEFAULT_ITERATIONS);
    expect(storedVault.digest).toBe(DEFAULT_DIGEST);

    // Round-trip: the preserved mnemonic decrypts back, keyed by the account id.
    const decrypted = await unlock<Record<string, string>>(storedVault as never, PASSWORD);
    expect(decrypted).toEqual({ 'acc-1': MNEMONIC });

    // Legacy keys are cleaned up.
    expect(mockRemove).toHaveBeenCalledWith(STORAGE_KEYS.WALLETS);
  });

  it('returns needs-password when a protected wallet is migrated without a password', async () => {
    mockGet.mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.WALLETS) {
        return { passwordRequired: true, wallets: [] } as never;
      }
      return null as never;
    });

    const result = await migrateLegacyWallets(makeDeps());
    expect(result.status).toBe('needs-password');
  });

  it('returns no-migration when there is no legacy wallet', async () => {
    mockGet.mockResolvedValue(null as never);
    const result = await migrateLegacyWallets(makeDeps(), PASSWORD);
    expect(result.status).toBe('no-migration');
  });
});
