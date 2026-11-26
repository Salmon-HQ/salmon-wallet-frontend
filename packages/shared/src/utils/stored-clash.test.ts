/**
 * One secret is one wallet, decided against what storage holds: the list and
 * the opened vault, never the window's memory or the network catalog.
 */
import bs58 from 'bs58';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPair, getSolanaDerivationPath } from '../blockchain/solana/factory';
import { generateMnemonic } from '../crypto/mnemonic';
import { DuplicateAccountError } from '../hooks/useAccountsMutationHelpers';
import type { Account, AccountSecret, NetworkPathIndexes, StoredAccount } from '../types/account';
import type { SecretVault, StoredSecret } from './account-secret';
import { findStoredClash } from './stored-clash';

vi.mock('../api/services/network', () => {
  const offline = vi.fn(async () => {
    throw new Error('no network in a duplicate check');
  });
  return {
    getNetworks: offline,
    getNetwork: offline,
    getEnabledNetworkIds: offline,
    isBackendNetworkEnabled: offline,
  };
});

// TEST-ONLY phrases: a BIP39 test vector and one made per run; no funds.
const M =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const M2 = generateMnemonic();

const SOL = 'solana-mainnet';
const BTC = 'bitcoin-mainnet';

/** `[null × i, i]`, the way a wallet created at position i is stored. */
const at = (i: number) => [...Array<null>(i).fill(null), i];

const addressAt = async (mnemonic: string, i: number) =>
  (await generateKeyPair(mnemonic, getSolanaDerivationPath(i))).signer.address;

/** The base58 64-byte secret key (`seed ‖ publicKey`) of a phrase's Solana position. */
async function secretKeyAt(mnemonic: string, i: number): Promise<string> {
  const { seed, signer } = await generateKeyPair(mnemonic, getSolanaDerivationPath(i));
  return bs58.encode(Uint8Array.from([...seed, ...bs58.decode(signer.address)]));
}

const newWallet = (
  id: string,
  secret: AccountSecret,
  pathIndexes: NetworkPathIndexes = { [SOL]: [0] }
): Account => ({ id, name: 'name', avatar: 'default', secret, pathIndexes, networksAccounts: {} });

const phrase = (mnemonic: string, start = 0, id = 'new-id') =>
  newWallet(id, { kind: 'mnemonic', mnemonic }, { [SOL]: at(start), [BTC]: at(start) });
const privateKey = (key: string, id = 'new-id') =>
  newWallet(id, { kind: 'privateKey', privateKey: key, networkId: SOL });
const watched = (address: string, id = 'new-id') =>
  newWallet(id, { kind: 'watchOnly', address, networkId: SOL });
const seedVault = (address: string, authToken = '7', id = 'new-id') =>
  newWallet(id, {
    kind: 'seedVault',
    authToken,
    derivationPath: "m/44'/501'/0'/0'",
    address,
    networkId: SOL,
  });

/** Storage holding these wallets: the list entry and the vault entry of each. */
function storage(
  wallets: { id: string; secret?: SecretVault[string]; pathIndexes?: NetworkPathIndexes }[]
): [StoredAccount[], SecretVault] {
  const list = wallets.map(({ id, pathIndexes = { [SOL]: [0] } }) => ({
    id,
    name: 'name',
    avatar: 'default',
    pathIndexes,
  }));
  const secrets = Object.fromEntries(
    wallets.flatMap(({ id, secret }) => (secret === undefined ? [] : [[id, secret]]))
  );
  return [list, secrets];
}

const fetchSpy = vi.fn(async () => {
  throw new Error('no network in a duplicate check');
});

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a recovery phrase', () => {
  it('is refused at the start a listed phrase wallet holds, whatever its spacing', async () => {
    const [list, secrets] = storage([{ id: 'listed-p', secret: M }]);

    await expect(
      findStoredClash(phrase(`  ${M.toUpperCase().replace(/ /g, '   ')} `), list, secrets)
    ).rejects.toBeInstanceOf(DuplicateAccountError);
  });

  it('is saved at another start, as a derived wallet is', async () => {
    const [list, secrets] = storage([{ id: 'listed-p', secret: M }]);

    await expect(findStoredClash(phrase(M, 3), list, secrets)).resolves.toEqual({ replace: [] });
  });

  it('is refused at a position the listed wallet holds besides its start', async () => {
    const [list, secrets] = storage([
      { id: 'listed-p', secret: M, pathIndexes: { [SOL]: [0, null, null, 3] } },
    ]);

    await expect(findStoredClash(phrase(M, 3), list, secrets)).rejects.toBeInstanceOf(
      DuplicateAccountError
    );
  });

  it.each<[string, () => Promise<AccountSecret>]>([
    [
      'watched',
      async () => ({ kind: 'watchOnly', address: await addressAt(M, 0), networkId: SOL }),
    ],
    [
      'private-key',
      async () => ({ kind: 'privateKey', privateKey: await secretKeyAt(M, 0), networkId: SOL }),
    ],
    [
      'Seed Vault',
      async () => ({
        kind: 'seedVault',
        authToken: '7',
        derivationPath: "m/44'/501'/0'/0'",
        address: await addressAt(M, 0),
        networkId: SOL,
      }),
    ],
  ])('is saved when a %s wallet holds its address', async (_kind, secret) => {
    const [list, secrets] = storage([{ id: 'listed', secret: await secret() }]);

    await expect(findStoredClash(phrase(M, 0), list, secrets)).resolves.toEqual({ replace: [] });
  });
});

describe('a private key or a watched address', () => {
  it.each<[string, () => Promise<StoredSecret>]>([
    ['a phrase wallet', async () => M],
    [
      'a private-key wallet',
      async () => ({ kind: 'privateKey', privateKey: await secretKeyAt(M, 0), networkId: SOL }),
    ],
    [
      'a watched wallet',
      async () => ({ kind: 'watchOnly', address: await addressAt(M, 0), networkId: SOL }),
    ],
    [
      'a Seed Vault wallet',
      async () => ({
        kind: 'seedVault',
        authToken: '7',
        derivationPath: "m/44'/501'/0'/0'",
        address: await addressAt(M, 0),
        networkId: SOL,
      }),
    ],
  ])('is refused when %s in storage holds its address', async (_kind, secret) => {
    const [list, secrets] = storage([{ id: 'listed', secret: await secret() }]);

    await expect(
      findStoredClash(privateKey(await secretKeyAt(M, 0)), list, secrets)
    ).rejects.toBeInstanceOf(DuplicateAccountError);
    await expect(
      findStoredClash(watched(await addressAt(M, 0)), list, secrets)
    ).rejects.toBeInstanceOf(DuplicateAccountError);
  });

  it('is refused for a listed phrase address without asking the network catalog', async () => {
    const [list, secrets] = storage([{ id: 'listed-p', secret: M }]);

    await expect(
      findStoredClash(privateKey(await secretKeyAt(M, 0)), list, secrets)
    ).rejects.toBeInstanceOf(DuplicateAccountError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('is saved when the phrase holds that position only on Bitcoin', async () => {
    const [list, secrets] = storage([{ id: 'listed-p', secret: M, pathIndexes: { [BTC]: at(4) } }]);

    await expect(
      findStoredClash(privateKey(await secretKeyAt(M, 4)), list, secrets)
    ).resolves.toEqual({ replace: [] });
  });

  it('skips a null index, a missing entry, an invalid phrase and an undecodable key, and still compares the rest', async () => {
    const [list, secrets] = storage([
      { id: 'missing' },
      { id: 'invalid', secret: 'not a phrase at all' },
      { id: 'undecodable', secret: { kind: 'privateKey', privateKey: '0OIl', networkId: SOL } },
      { id: 'listed-p', secret: M, pathIndexes: { [SOL]: [null, 1] } },
    ]);

    await expect(
      findStoredClash(privateKey(await secretKeyAt(M, 1)), list, secrets)
    ).rejects.toBeInstanceOf(DuplicateAccountError);
    await expect(
      findStoredClash(privateKey(await secretKeyAt(M, 0)), list, secrets)
    ).resolves.toEqual({ replace: [] });
    await expect(
      findStoredClash(privateKey(await secretKeyAt(M2, 0)), list, secrets)
    ).resolves.toEqual({ replace: [] });
  });
});

describe("the wallet's own id", () => {
  it('is never a clash with itself', async () => {
    const key = await secretKeyAt(M, 0);

    await expect(
      findStoredClash(phrase(M, 0, 'own'), ...storage([{ id: 'own', secret: M }]))
    ).resolves.toEqual({ replace: [] });
    await expect(
      findStoredClash(
        privateKey(key, 'own'),
        ...storage([{ id: 'own', secret: { kind: 'privateKey', privateKey: key, networkId: SOL } }])
      )
    ).resolves.toEqual({ replace: [] });
  });
});

describe('a Seed Vault account', () => {
  it('replaces every listed Seed Vault wallet with its address, and nothing else', async () => {
    const Y = await addressAt(M, 0);
    const Z = await addressAt(M2, 0);
    const sv = (address: string, authToken: string) => ({
      kind: 'seedVault' as const,
      authToken,
      derivationPath: "m/44'/501'/0'/0'",
      address,
      networkId: SOL,
    });
    const [list, secrets] = storage([
      { id: 'sv-1', secret: sv(Y, '1') },
      { id: 'phrase-y', secret: M },
      { id: 'watched-y', secret: { kind: 'watchOnly', address: Y, networkId: SOL } },
      { id: 'sv-z', secret: sv(Z, '3') },
      { id: 'sv-2', secret: sv(Y, '2') },
    ]);

    await expect(findStoredClash(seedVault(Y), list, secrets)).resolves.toEqual({
      replace: ['sv-1', 'sv-2'],
    });
    await expect(findStoredClash(seedVault(Y, '1', 'sv-1'), list, secrets)).resolves.toEqual({
      replace: ['sv-2'],
    });
  });
});

describe('DuplicateAccountError', () => {
  it('names no secret, address or id', async () => {
    const address = await addressAt(M, 0);
    const [list, secrets] = storage([{ id: 'listed-p', secret: M }]);
    const errors = await Promise.all([
      findStoredClash(phrase(M), list, secrets).catch((err: unknown) => err),
      findStoredClash(watched(address), list, secrets).catch((err: unknown) => err),
    ]);

    for (const error of errors) {
      expect(error).toBeInstanceOf(DuplicateAccountError);
      const { message } = error as Error;
      for (const leak of ['abandon', 'about', address, 'listed-p', 'new-id']) {
        expect(message).not.toContain(leak);
      }
    }
  });
});
