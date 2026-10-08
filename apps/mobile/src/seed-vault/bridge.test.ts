// Seed Vault exists only on a device; the test drives the native module's
// promises and checks what Salmon sends it and how it reads the answers.
jest.mock('@solana-mobile/seed-vault-lib', () => ({
  __esModule: true,
  SeedVault: {
    isSeedVaultAvailable: jest.fn(),
    authorizeNewSeed: jest.fn(),
    getAuthorizedSeeds: jest.fn(),
    createNewSeed: jest.fn(),
    getAccounts: jest.fn(),
    getUserWallets: jest.fn(),
    signTransactions: jest.fn(),
    signMessages: jest.fn(),
    deauthorizeSeed: jest.fn(),
  },
  SeedVaultPermissionAndroid: 'com.solanamobile.seedvault.ACCESS_SEED_VAULT',
}));

jest.mock('@salmon/shared', () => {
  class SeedVaultError extends Error {
    reason: string;
    constructor(why: string) {
      super(why);
      this.name = 'SeedVaultError';
      this.reason = why;
    }
  }
  const isSeedVaultError = (e: unknown) => e instanceof SeedVaultError;
  return { __esModule: true, SeedVaultError, isSeedVaultError };
});

import { Buffer } from 'buffer';

import {
  authorizeSeed,
  createSeed,
  deauthorizeSeed,
  isSeedVaultScreenOpen,
  listSeedVaultAccounts,
  onSeedVaultScreensClosed,
  SEED_VAULT_SCREEN_TIMEOUT_MS,
  seedVaultBridge,
} from './bridge';

const mockNative = jest.requireMock('@solana-mobile/seed-vault-lib').SeedVault as Record<
  string,
  jest.Mock
>;

const b64 = (bytes: number[]) => Buffer.from(bytes).toString('base64');
const PATH = "bip32:/m/44'/501'/0'/0'";

describe('Seed Vault bridge', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends one request per payload for the account path and reads back the signatures', async () => {
    mockNative.signTransactions.mockResolvedValue([
      { signatures: [b64(Array(64).fill(1))], resolvedDerivationPaths: [PATH] },
      { signatures: [b64(Array(64).fill(2))], resolvedDerivationPaths: [PATH] },
    ]);

    const signatures = await seedVaultBridge.signTransactions('4001', PATH, [
      Uint8Array.of(9),
      Uint8Array.of(8),
    ]);

    expect(mockNative.signTransactions).toHaveBeenCalledWith('4001', [
      { payload: b64([9]), requestedSignatures: [PATH] },
      { payload: b64([8]), requestedSignatures: [PATH] },
    ]);
    expect(signatures.map((s) => Array.from(s))).toEqual([Array(64).fill(1), Array(64).fill(2)]);
  });

  it('reads a cancelled confirmation as cancelled', async () => {
    mockNative.signMessages.mockRejectedValue(new Error('signMessages failed with result=0'));

    await expect(
      seedVaultBridge.signMessages('4001', PATH, [Uint8Array.of(1)])
    ).rejects.toMatchObject({
      reason: 'cancelled',
    });
  });

  it('reads an invalid authorization as revoked access', async () => {
    mockNative.signTransactions.mockRejectedValue(
      new Error('signTransactions failed with result=1002')
    );

    await expect(
      seedVaultBridge.signTransactions('4001', PATH, [Uint8Array.of(1)])
    ).rejects.toMatchObject({
      reason: 'revoked',
    });
  });

  it('authorizes the new seed when creating it returns no usable authorization', async () => {
    mockNative.createNewSeed.mockResolvedValue({ authToken: '-1' });
    mockNative.authorizeNewSeed.mockResolvedValue({ authToken: '4002' });

    await expect(createSeed()).resolves.toBe('4002');
  });

  it("lists accounts and marks the ones the seed's own wallet uses", async () => {
    mockNative.getAccounts.mockResolvedValue([
      { id: '1', name: 'Main', derivationPath: PATH, publicKeyEncoded: 'Addr1' },
      {
        id: '2',
        name: 'Addr2',
        derivationPath: "bip32:/m/44'/501'/1'/0'",
        publicKeyEncoded: 'Addr2',
      },
    ]);
    mockNative.getUserWallets.mockResolvedValue([
      { id: '1', name: 'Main', derivationPath: PATH, publicKeyEncoded: 'Addr1' },
    ]);

    await expect(listSeedVaultAccounts('4001')).resolves.toEqual([
      { derivationPath: PATH, address: 'Addr1', name: 'Main', isUserWallet: true },
      {
        derivationPath: "bip32:/m/44'/501'/1'/0'",
        address: 'Addr2',
        name: 'Addr2',
        isUserWallet: false,
      },
    ]);
    expect(mockNative.getAccounts).toHaveBeenCalledWith('4001', null, null);
  });
});

describe('Seed Vault screen tracking', () => {
  it("reports Seed Vault's screen as open while a request waits, and closed after, even on failure", async () => {
    let finish!: (value: unknown) => void;
    mockNative.signMessages.mockReturnValue(new Promise((_, reject) => (finish = reject)));

    const pending = seedVaultBridge.signMessages('4001', PATH, [Uint8Array.of(1)]);
    expect(isSeedVaultScreenOpen()).toBe(true);

    finish(new Error('signMessages failed with result=0'));
    await expect(pending).rejects.toBeDefined();
    expect(isSeedVaultScreenOpen()).toBe(false);
  });
});

describe('Seed Vault bridge — review fixes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('gives up on a Seed Vault screen that never answers, and reports it closed', async () => {
    jest.useFakeTimers();
    const closed = jest.fn();
    const stop = onSeedVaultScreensClosed(closed);
    mockNative.signMessages.mockReturnValue(new Promise(() => {}));

    const pending = seedVaultBridge.signMessages('4001', PATH, [Uint8Array.of(1)]);
    const outcome = expect(pending).rejects.toMatchObject({ reason: 'failed' });
    jest.advanceTimersByTime(SEED_VAULT_SCREEN_TIMEOUT_MS + 1);
    await outcome;

    expect(isSeedVaultScreenOpen()).toBe(false);
    expect(closed).toHaveBeenCalledTimes(1);
    stop();
    jest.useRealTimers();
  });

  it('reads "no seed to authorize" as its own reason', async () => {
    mockNative.authorizeNewSeed.mockRejectedValue(
      new Error('authorizeSeed failed with result=1005')
    );

    await expect(authorizeSeed()).rejects.toMatchObject({ reason: 'no-seeds' });
  });

  it('does not give up an access Seed Vault no longer lists', async () => {
    mockNative.getAuthorizedSeeds.mockResolvedValue([{ authToken: '4002' }]);

    await deauthorizeSeed('4001');

    expect(mockNative.deauthorizeSeed).not.toHaveBeenCalled();
  });

  it('gives up an access Seed Vault still lists', async () => {
    mockNative.getAuthorizedSeeds.mockResolvedValue([{ authToken: '4001' }]);

    await deauthorizeSeed('4001');

    expect(mockNative.deauthorizeSeed).toHaveBeenCalledWith('4001');
  });
});
