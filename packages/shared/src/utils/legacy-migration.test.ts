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
import type { RestoreAccountOptions } from '../types/account';
import * as storage from '../storage';
import { STORAGE_KEYS } from '../storage';

const PASSWORD = 'correct horse battery staple';
const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const ADDRESS = 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk';

const mockGet = vi.mocked(storage.getStorageItem);
const mockSet = vi.mocked(storage.setStorageItem);
const mockRemove = vi.mocked(storage.removeStorageItem);

/**
 * A stand-in for deriving an address from a seed: which address a seed owns is
 * the point here, not the real derivation (covered in mnemonic.test.ts).
 */
const derivedFrom = (mnemonic: string) => (mnemonic === MNEMONIC ? ADDRESS : `derived:${mnemonic}`);

/** Minimal deps: restoreAccount "derives" each slot through `derivedFrom`. */
function makeDeps(): MigrationDeps {
  return {
    restoreAccount: vi.fn(async ({ secret, pathIndexes = {} }: RestoreAccountOptions) => ({
      id: 'acc-1',
      pathIndexes,
      networksAccounts: Object.fromEntries(
        Object.entries(pathIndexes).map(([networkId, indexes]) => [
          networkId,
          indexes.map((index: number | null) => ({
            path: `m/44'/501'/${index}'/0'`,
            network: { id: networkId },
            getReceiveAddress: () => derivedFrom(secret.kind === 'mnemonic' ? secret.mnemonic : ''),
          })),
        ])
      ),
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

  // v2 let an owner keep seed phrases with no password. Such a record is not
  // migrated through the lock screen, where any typed text would become the
  // password; it waits for a password chosen on the create-password screen.
  const unprotected = () =>
    mockGet.mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.WALLETS) {
        return {
          passwordRequired: false,
          wallets: [
            { address: ADDRESS, path: "m/44'/501'/0'/0'", chain: 'solana', mnemonic: MNEMONIC },
          ],
        } as never;
      }
      return null as never;
    });

  it('asks for a new password for an unprotected record, naming its addresses, and writes nothing', async () => {
    unprotected();

    for (const password of [undefined, PASSWORD]) {
      expect(await migrateLegacyWallets(makeDeps(), password)).toEqual({
        status: 'needs-new-password',
        addresses: [ADDRESS],
      });
    }
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('names the addresses its seeds derive, never the ones the record claims', async () => {
    const OTHER = 'stub seed of another wallet';
    mockGet.mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.WALLETS) {
        return {
          passwordRequired: false,
          wallets: [
            { address: ADDRESS, path: "m/44'/501'/0'/0'", chain: 'solana', mnemonic: OTHER },
          ],
        } as never;
      }
      return null as never;
    });

    expect(await migrateLegacyWallets(makeDeps())).toEqual({
      status: 'needs-new-password',
      addresses: [`derived:${OTHER}`],
    });
  });

  it('refuses an unprotected record with no seed to derive an address from', async () => {
    mockGet.mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.WALLETS) {
        return {
          passwordRequired: false,
          wallets: [{ address: ADDRESS, path: "m/44'/501'/0'/0'", chain: 'solana' }],
        } as never;
      }
      return null as never;
    });

    await expect(migrateLegacyWallets(makeDeps())).rejects.toThrow();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('migrates an unprotected record encrypted under a newly chosen password', async () => {
    unprotected();

    const result = await migrateLegacyWallets(makeDeps(), PASSWORD, { newPassword: true });

    expect(result.status).toBe('migrated');
    const storedVault = mockSet.mock.calls.find(([key]) => key === STORAGE_KEYS.MNEMONICS)?.[1] as {
      isEncrypted: boolean;
    };
    expect(storedVault.isEncrypted).toBe(true);
    expect(await unlock<Record<string, string>>(storedVault as never, PASSWORD)).toEqual({
      'acc-1': MNEMONIC,
    });
    expect(mockRemove).toHaveBeenCalledWith(STORAGE_KEYS.WALLETS);
  });

  it('leaves an existing vault alone: a legacy record beside it is never migrated over it', async () => {
    const encryptedMnemonics = await lock({ [ADDRESS]: MNEMONIC }, PASSWORD);
    mockGet.mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.WALLETS) {
        return {
          passwordRequired: true,
          wallets: [{ address: ADDRESS, path: "m/44'/501'/0'/0'", chain: 'solana' }],
          mnemonics: encryptedMnemonics,
        } as never;
      }
      if (key === STORAGE_KEYS.MNEMONICS) return { isEncrypted: true } as never;
      return null as never;
    });

    const result = await migrateLegacyWallets(makeDeps(), PASSWORD);

    expect(result.status).toBe('no-migration');
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  // A migration that stopped after writing the vault leaves the cleartext record
  // behind. It goes once the vault is shown to hold every seed it carries.
  describe('an unprotected record left beside the vault it migrated into', () => {
    const leftover = (vault: unknown) =>
      mockGet.mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.WALLETS) {
          return {
            passwordRequired: false,
            wallets: [
              { address: ADDRESS, path: "m/44'/501'/0'/0'", chain: 'solana', mnemonic: MNEMONIC },
            ],
          } as never;
        }
        if (key === STORAGE_KEYS.MNEMONICS) return vault as never;
        return null as never;
      });

    it('is removed once the vault opens and holds every one of its seeds', async () => {
      leftover({ ...(await lock({ 'acc-1': MNEMONIC }, PASSWORD)), isEncrypted: true });

      expect(await migrateLegacyWallets(makeDeps(), PASSWORD)).toEqual({ status: 'no-migration' });
      expect(mockRemove).toHaveBeenCalledWith(STORAGE_KEYS.WALLETS);
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('stays when the vault lacks one of its seeds', async () => {
      leftover({ ...(await lock({ 'acc-1': 'another seed' }, PASSWORD)), isEncrypted: true });

      expect(await migrateLegacyWallets(makeDeps(), PASSWORD)).toEqual({ status: 'no-migration' });
      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('stays when the vault does not open, or with no password to open it', async () => {
      leftover({ ...(await lock({ 'acc-1': MNEMONIC }, PASSWORD)), isEncrypted: true });

      expect(await migrateLegacyWallets(makeDeps(), 'wrong password')).toEqual({
        status: 'no-migration',
      });
      expect(await migrateLegacyWallets(makeDeps())).toEqual({ status: 'no-migration' });
      expect(mockRemove).not.toHaveBeenCalled();
    });
  });

  it('returns no-migration when there is no legacy wallet', async () => {
    mockGet.mockResolvedValue(null as never);
    const result = await migrateLegacyWallets(makeDeps(), PASSWORD);
    expect(result.status).toBe('no-migration');
  });
});
