/**
 * @vitest-environment jsdom
 *
 * Saving a wallet lands completely or not at all. Each case runs the real
 * `useAccounts` in a fresh runtime over the crash double, makes one write of
 * the save fail or kills the process after it, and checks what the open
 * window and the next launch show. The sweeps walk the write log of a clean
 * run of the same save, so a row added later joins them on its own.
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCrashStorage, type CrashStorage } from '../test-utils/crash-storage';
import type { Account, StoredAccount } from '../types/account';
import type { BlockchainAccount } from '../types/blockchain';

/** Runs when a save seals its new vault: after its first reads, before its vault write. */
const sealing = vi.hoisted(() => ({ hook: null as (() => void) | null }));

vi.mock('../crypto/encryption', async (importOriginal) => {
  const cipher = (await import('../test-utils/crash-storage')).keySensitiveCipher(
    await importOriginal<typeof import('../crypto/encryption')>()
  );
  return {
    ...cipher,
    lockWithKey: ((...args) => {
      sealing.hook?.();
      return cipher.lockWithKey(...args);
    }) as typeof cipher.lockWithKey,
    lockAndGetKey: ((...args) => {
      sealing.hook?.();
      return cipher.lockAndGetKey(...args);
    }) as typeof cipher.lockAndGetKey,
  };
});

// The connection record follows the active wallet on every render; it is not
// a wallet record and would only add writes to the logs these tests read.
vi.mock('./useAccountsConnection', () => ({ useAccountsConnection: () => undefined }));

// Loading a wallet derives no address here: the catalog lives on the network.
vi.mock('../utils/account', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/account')>()),
  createBlockchainAccountForNetwork: vi.fn(async () => null),
  createBlockchainAccountForSeedVault: vi.fn(async () => ({ network: { id: 'solana-mainnet' } })),
}));

const ACCOUNTS = 'salmon_accounts';
const MNEMONICS = 'salmon_mnemonics';
const COUNTER = 'salmon_account_counter';
const WALLETS = 'salmon_wallets';
const ACCOUNT_ID = 'salmon_active_account_id';
const NETWORK_ID = 'salmon_active_network_id';
const PATH_INDEX = 'salmon_active_path_index';
const DERIVED_KEY = 'derived_key_cache';
const WALLET_KEYS = [
  ACCOUNTS,
  MNEMONICS,
  COUNTER,
  ACCOUNT_ID,
  NETWORK_ID,
  PATH_INDEX,
  'salmon_unconfirmed_phrases',
];
const NETWORK = 'solana-mainnet';

/** Stands in for the derived account a wallet holds at Solana mainnet slot 0. */
const held = { network: { id: NETWORK } } as unknown as BlockchainAccount;

const wallet = (name: string, mnemonic = `phrase of ${name}`): Account => ({
  id: `id-${name}-7f3`,
  name: `name-${name}`,
  avatar: 'default',
  secret: { kind: 'mnemonic', mnemonic },
  pathIndexes: { [NETWORK]: [0] },
  networksAccounts: { [NETWORK]: [held] },
});

const A = wallet('alpha');
const B = wallet('beta');
const C = wallet('gamma');
const D = wallet('delta');

/** Words that would leak a wallet into a message: its id, its name, its secret. */
const LEAKS = ['alpha', 'beta', 'gamma', 'phrase', '7f3'];

const stored = ({ id, name, avatar }: Account): StoredAccount => ({
  id,
  name,
  avatar,
  pathIndexes: { [NETWORK]: [0] },
});

const secretsOf = (wallets: Account[]) =>
  Object.fromEntries(
    wallets.map(({ id, secret }) => [id, secret.kind === 'mnemonic' ? secret.mnemonic : secret])
  );

let crash: CrashStorage;

const runtime = async () => ({
  storage: await import('../storage'),
  helpers: await import('./useAccountsMutationHelpers'),
  encryption: await import('../crypto/encryption'),
});

interface SeedOptions {
  vault?: Account[] | null;
  password?: string;
  cacheKey?: boolean;
  counter?: number;
}

/** The listed wallets with A's selection, and a vault under `password` whose key is cached. */
async function seed(
  listed: Account[],
  { vault = listed, password = 'P1', cacheKey = true, counter = listed.length }: SeedOptions = {}
): Promise<void> {
  const { storage, encryption } = await runtime();
  if (listed.length > 0) {
    await storage.setStorageItem(ACCOUNTS, listed.map(stored));
    await storage.setStorageItem(COUNTER, counter);
    await storage.setStorageItem(ACCOUNT_ID, listed[0].id);
    await storage.setStorageItem(NETWORK_ID, NETWORK);
    await storage.setStorageItem(PATH_INDEX, 0);
  }
  if (!vault) return;
  const { vault: locked, keyCache } = await encryption.lockAndGetKey(secretsOf(vault), password);
  await storage.setStorageItem(MNEMONICS, { ...locked, isEncrypted: true });
  if (cacheKey) await storage.setStashItem(DERIVED_KEY, keyCache);
}

async function mount() {
  const { useAccounts } = await import('./useAccounts');
  const view = renderHook(() => useAccounts());
  await waitFor(() => expect(view.result.current[0].ready).toBe(true));
  return view;
}

type View = Awaited<ReturnType<typeof mount>>;
type Change = (view: View) => Promise<unknown>;

const actions = (view: View) => view.result.current[1];
const heldIds = (view: View) => view.result.current[0].accounts.map(({ id }) => id);
const storedIds = () =>
  ((crash.snapshot()[ACCOUNTS] as StoredAccount[] | undefined) ?? []).map(({ id }) => id);

const walletRecords = () =>
  Object.fromEntries(Object.entries(crash.snapshot()).filter(([key]) => WALLET_KEYS.includes(key)));

/** The stored vault opened with `password`; null when there is none. */
async function storedSecrets(password = 'P1'): Promise<Record<string, unknown> | null> {
  const { encryption } = await runtime();
  const vault = crash.snapshot()[MNEMONICS];
  if (!vault) return null;
  return encryption.unlock(vault as Parameters<typeof encryption.unlock>[0], password);
}

async function attempt(change: () => Promise<unknown>): Promise<unknown> {
  let error: unknown;
  await act(async () => {
    try {
      await change();
    } catch (err) {
      error = err;
    }
  });
  return error;
}

async function restart(): Promise<void> {
  cleanup();
  crash = await startCrashStorage({ platform: 'extension' });
  await crash.relaunch();
}

/** The keys a clean run of the change writes, in order, from a runtime thrown away after. */
async function cleanRun(prepare: () => Promise<View>, change: Change): Promise<string[]> {
  const view = await prepare();
  const mark = crash.writes.length;
  await act(async () => {
    await change(view);
  });
  const keys = crash.writes.slice(mark).map(({ key }) => key);
  await restart();
  expect(keys).toContain(ACCOUNTS);
  return keys;
}

const listed = async (wallets: Account[], options?: SeedOptions) => {
  await seed(wallets, options);
  return mount();
};

/** Wallet writes that are best effort log a warning; the sweeps hit every one. */
const silence = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

beforeEach(async () => {
  // The extension's windows take a Web Locks lock that admits one holder and
  // is not reentrant; jsdom has no `navigator.locks` of its own. The list
  // read-back after a failed write is the extension's too.
  let tail: Promise<unknown> = Promise.resolve();
  vi.stubGlobal('navigator', {
    locks: {
      request<T>(_name: string, write: () => Promise<T>): Promise<T> {
        const run = tail.then(write);
        tail = run.catch(() => undefined);
        return run;
      },
    },
  });
  crash = await startCrashStorage({ platform: 'extension' });
  await crash.relaunch();
});

afterEach(() => {
  sealing.hook = null;
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * A and B listed, A active, after an add of C that failed or was killed at
 * `label`. Storage holds either the wallets before or the wallets after; the
 * window, when given, follows the list.
 */
async function expectAddSettled(label: string, view?: View, error?: unknown): Promise<void> {
  const landed = storedIds().includes(C.id);
  const snapshot = crash.snapshot();
  const secrets = await storedSecrets();
  expect(secrets, label).not.toBeNull();
  // Every entry there before is intact, and every listed id has its entry.
  expect(secrets, label).toMatchObject(secretsOf([A, B]));
  for (const id of storedIds()) expect(secrets?.[id], label).toBeDefined();

  if (!landed) {
    expect(storedIds(), label).toEqual([A.id, B.id]);
    expect(snapshot[ACCOUNT_ID], label).toBe(A.id);
    expect(snapshot[NETWORK_ID], label).toBe(NETWORK);
    expect(snapshot[PATH_INDEX], label).toBe(0);
    expect(snapshot[COUNTER], label).toBe(2);
  } else {
    expect(storedIds(), label).toEqual([A.id, B.id, C.id]);
    expect([A.id, C.id], label).toContain(snapshot[ACCOUNT_ID]);
    const active = (snapshot[ACCOUNTS] as StoredAccount[]).find(
      ({ id }) => id === snapshot[ACCOUNT_ID]
    );
    const network = snapshot[NETWORK_ID] as string;
    const slot = snapshot[PATH_INDEX] as number;
    expect(active?.pathIndexes[network]?.[slot], label).toBe(slot);
    expect([2, 3], label).toContain(snapshot[COUNTER]);
  }

  if (!view) return;
  expect(error === undefined, label).toBe(landed);
  const state = view.result.current[0];
  expect(heldIds(view), label).toEqual(landed ? [A.id, B.id, C.id] : [A.id, B.id]);
  expect(state.accountId, label).toBe(landed ? C.id : A.id);
  expect(state.counter, label).toBe(landed ? 3 : 2);
}

/** A retry of the same save ends with one wallet and one entry for C. */
async function expectOneC(view: View, change: Change, label: string): Promise<void> {
  await act(async () => {
    await change(view);
  });
  expect(
    storedIds().filter((id) => id === C.id),
    label
  ).toHaveLength(1);
  expect(
    Object.keys((await storedSecrets()) ?? {}).filter((id) => id === C.id),
    label
  ).toHaveLength(1);
  expect(
    heldIds(view).filter((id) => id === C.id),
    label
  ).toHaveLength(1);
}

describe('adding a wallet beside A and B', () => {
  const prepare = () => listed([A, B]);
  const change: Change = (view) => actions(view).addAccount(C);

  it('leaves the wallets before or the wallets after, whichever write fails', async () => {
    silence();
    const keys = await cleanRun(prepare, change);

    for (let n = 1; n <= keys.length; n += 1) {
      const label = `fail at write ${n} (${keys[n - 1]})`;
      await restart();
      const view = await prepare();
      crash.failAt(n);

      const error = await attempt(() => change(view));

      await expectAddSettled(label, view, error);
      await expectOneC(view, change, label);
    }
  });

  it('leaves the wallets before or the wallets after, whichever write is the last to land', async () => {
    silence();
    const keys = await cleanRun(prepare, change);

    for (let n = 0; n < keys.length; n += 1) {
      const label = `killed after write ${n}`;
      await restart();
      const view = await prepare();
      crash.killAfter(n);
      await attempt(() => change(view));
      cleanup();
      await crash.relaunch({ keepStash: true });

      const relaunched = await mount();

      await expectAddSettled(label);
      expect(heldIds(relaunched), label).toEqual(storedIds());
      await expectOneC(relaunched, change, label);
    }
  });

  it('refuses an id that storage holds under another secret, writing nothing', async () => {
    const impostor = wallet('gamma', 'another set of words');
    await seed([A, B], { vault: [A, B, impostor] });
    const view = await mount();
    const before = walletRecords();
    const mark = crash.writes.length;

    const error = await attempt(() => actions(view).addAccount(C));

    expect(error).toBeInstanceOf(Error);
    expect(Object.getPrototypeOf(error)).toBe(Error.prototype);
    for (const word of LEAKS) expect((error as Error).message).not.toContain(word);
    expect(crash.writes.slice(mark).filter(({ key }) => WALLET_KEYS.includes(key))).toEqual([]);
    expect(walletRecords()).toEqual(before);
    expect((await storedSecrets())?.[C.id]).toBe('another set of words');
    expect(heldIds(view)).toEqual([A.id, B.id]);
  });

  it('shows C once when a reload already put it in memory before the retry', async () => {
    const view = await listed([A, B, C]);

    await act(() => actions(view).addAccount(C));

    expect(heldIds(view)).toEqual([A.id, B.id, C.id]);
    expect(storedIds()).toEqual([A.id, B.id, C.id]);
  });

  it('raises a counter left behind by a save killed after its list', async () => {
    const view = await listed([A, B, C], { counter: 2 });

    await act(() => actions(view).addAccount(D));

    expect(crash.snapshot()[COUNTER]).toBe(4);
  });

  it('writes no counter when the save overwrites its own id', async () => {
    const view = await listed([A, B, C]);
    const mark = crash.writes.length;

    await act(() => actions(view).addAccount(C));

    expect(crash.writes.slice(mark).map(({ key }) => key)).not.toContain(COUNTER);
    expect(crash.snapshot()[COUNTER]).toBe(3);
    expect(view.result.current[0].counter).toBe(3);
  });

  it('keeps the window counter equal to the stored one after a save', async () => {
    const view = await prepare();

    await act(() => change(view));

    expect(view.result.current[0].counter).toBe(crash.snapshot()[COUNTER]);
  });

  it('leaves no own-write mark when a stale window adds C after another added D', async () => {
    await seed([A, B]);
    const stale = await mount();
    const staleHelpers = (await runtime()).helpers;
    await crash.relaunch({ keepStash: true });
    const other = await mount();
    await act(() => actions(other).addAccount(D));

    await act(() => actions(stale).addAccount(C));

    expect(storedIds()).toEqual([A.id, B.id, D.id, C.id]);
    expect(staleHelpers.isOwnStoredAccountsWrite([A.id, B.id, D.id, C.id])).toBe(false);
  });

  it('runs the counter and selection rows after a list write that landed and threw', async () => {
    const keys = await cleanRun(prepare, change);
    const view = await prepare();
    const mark = crash.writes.length;
    crash.failAt(keys.indexOf(ACCOUNTS) + 1, { applied: true });

    await act(() => change(view));

    const written = crash.writes.slice(mark).map(({ key }) => key);
    expect(written.indexOf(COUNTER)).toBeGreaterThan(written.indexOf(ACCOUNTS));
    expect(written.indexOf(ACCOUNT_ID)).toBeGreaterThan(written.indexOf(ACCOUNTS));
    expect(crash.snapshot()[COUNTER]).toBe(3);
    expect(crash.snapshot()[ACCOUNT_ID]).toBe(C.id);
  });
});

describe('a first save', () => {
  const change: Change = (view) => actions(view).addAccount(C, 'P1');

  /** After a first save failed or was killed: nothing but C, under the chosen password. */
  async function expectFirstSaveSettled(label: string, view?: View, error?: unknown) {
    const landed = storedIds().includes(C.id);
    const secrets = await storedSecrets('P1');
    if (secrets) expect(secrets, label).toEqual(secretsOf([C]));
    if (landed) {
      expect(storedIds(), label).toEqual([C.id]);
      expect(secrets, label).not.toBeNull();
      expect(crash.snapshot()[COUNTER], label).toBeDefined();
    }
    if (!view) return;
    expect(error === undefined, label).toBe(landed);
    expect(heldIds(view), label).toEqual(landed ? [C.id] : []);
  }

  it('leaves no wallet or C under the chosen password, whichever write fails', async () => {
    silence();
    const keys = await cleanRun(mount, change);

    for (let n = 1; n <= keys.length; n += 1) {
      const label = `fail at write ${n} (${keys[n - 1]})`;
      await restart();
      const view = await mount();
      crash.failAt(n);

      const error = await attempt(() => change(view));

      await expectFirstSaveSettled(label, view, error);
      await expectOneC(view, change, label);
    }
  });

  it.each([false, true])(
    'deletes nothing at a relaunch (keepStash %s) after a kill, and a retry stores C once',
    async (keepStash) => {
      silence();
      const keys = await cleanRun(mount, change);

      for (let n = 0; n < keys.length; n += 1) {
        const label = `killed after write ${n}`;
        await restart();
        const view = await mount();
        crash.killAfter(n);
        await attempt(() => change(view));
        cleanup();
        await crash.relaunch({ keepStash });
        const before = crash.snapshot();

        const relaunched = await mount();

        for (const key of [ACCOUNTS, MNEMONICS, COUNTER]) {
          expect(crash.snapshot()[key], `${label}: ${key}`).toEqual(before[key]);
        }
        await expectFirstSaveSettled(label);
        await expectOneC(relaunched, change, label);
        expect(await storedSecrets('P1'), label).toEqual(secretsOf([C]));
      }
    }
  );

  it('seals a retry under another password after a vault write that did not land', async () => {
    const view = await mount();
    crash.failAt(1);
    await attempt(() => change(view));

    await act(() => actions(view).addAccount(C, 'P2'));

    expect(await storedSecrets('P2')).toEqual(secretsOf([C]));
    expect(storedIds()).toEqual([C.id]);
  });

  it('writes nothing when dropping a key left by an earlier attempt fails', async () => {
    const { storage, encryption } = await runtime();
    const { keyCache } = await encryption.lockAndGetKey({}, 'P0');
    await storage.setStashItem(DERIVED_KEY, keyCache);
    const view = await mount();
    crash.failStashAt(1);

    expect(await attempt(() => change(view))).toBeInstanceOf(Error);

    expect(walletRecords()).toEqual({});
  });

  it('asks for the stored password in the same session after a save whose vault landed', async () => {
    const keys = await cleanRun(mount, change);
    const view = await mount();
    expect(view.result.current[0].requiredLock).toBe(false);
    crash.failAt(keys.indexOf(ACCOUNTS) + 1);

    expect(await attempt(() => change(view))).toBeInstanceOf(Error);

    expect(crash.snapshot()[MNEMONICS]).toBeDefined();
    expect(view.result.current[0].requiredLock).toBe(true);
  });

  describe('over a garbled vault with nothing listed', () => {
    const prepare = async () => {
      await seed([], { vault: [B], cacheKey: false });
      crash.garbleRead(MNEMONICS);
      return mount();
    };

    it('keeps the single password form away after a failing save', async () => {
      silence();
      const keys = await cleanRun(prepare, change);
      const view = await prepare();
      crash.failAt(keys.indexOf(ACCOUNTS) + 1);

      expect(await attempt(() => change(view))).toBeInstanceOf(Error);

      expect(view.result.current[0].requiredLock).toBe(false);
    });

    it('throws the save error even when the vault read after it fails too', async () => {
      silence();
      const keys = await cleanRun(prepare, change);
      const view = await prepare();
      const { storage } = await runtime();
      crash.failAt(keys.indexOf(ACCOUNTS) + 1);
      sealing.hook = () => crash.failRead(MNEMONICS);

      const error = await attempt(() => change(view));

      expect(error).toBeInstanceOf(storage.StorageError);
      expect((error as Error).message).toContain(ACCOUNTS);
      expect(view.result.current[0].requiredLock).toBe(false);
    });
  });

  it('stores the counter before the list, so a kill right after the list leaves it', async () => {
    const keys = await cleanRun(mount, change);
    const view = await mount();
    crash.killAfter(keys.indexOf(ACCOUNTS) + 1);
    await attempt(() => change(view));

    expect(storedIds()).toEqual([C.id]);
    expect(crash.snapshot()[COUNTER]).toBeDefined();
    expect(keys.indexOf(COUNTER)).toBeGreaterThan(keys.indexOf(MNEMONICS));
    expect(keys.indexOf(COUNTER)).toBeLessThan(keys.indexOf(ACCOUNTS));
  });

  it('goes on with the save when the counter written before the list fails', async () => {
    const keys = await cleanRun(mount, change);
    const view = await mount();
    const warn = silence();
    crash.failAt(keys.indexOf(COUNTER) + 1);

    expect(await attempt(() => change(view))).toBeUndefined();

    expect(storedIds()).toEqual([C.id]);
    expect(heldIds(view)).toEqual([C.id]);
    expect(warn).toHaveBeenCalled();
  });
});

// Guards: a launch reads, and never repairs by deleting.
describe('a launch over what a stopped save leaves', () => {
  it.each([
    [
      'a vault with no list',
      async () => {
        await seed([], { vault: [C], cacheKey: false });
      },
    ],
    [
      'a v2 record',
      async () => {
        const { storage } = await runtime();
        await storage.setStorageItem(WALLETS, { passwordRequired: true, wallets: [] });
      },
    ],
    [
      'a vault in the clear',
      async () => {
        const { storage } = await runtime();
        await storage.setStorageItem(MNEMONICS, secretsOf([C]));
      },
    ],
  ])('removes and writes nothing over %s', async (_label, prepare) => {
    await prepare();
    await crash.relaunch();
    const before = crash.snapshot();
    const mark = crash.writes.length;

    await mount();

    expect(crash.writes.slice(mark)).toEqual([]);
    expect(crash.snapshot()).toEqual(before);
  });
});

const seedVaultWallet = (name: string, address: string, authToken: string): Account => ({
  ...wallet(name),
  secret: {
    kind: 'seedVault',
    authToken,
    derivationPath: "m/44'/501'/0'/0'",
    address,
    networkId: NETWORK,
  },
});

describe('a Seed Vault account whose address only storage lists', () => {
  // Two Seed Vault wallets for one address, a third on another address sharing
  // the second one's access token, and the account that replaces the first two.
  const S1 = seedVaultWallet('sv-one', 'AddrY', '1');
  const S2 = seedVaultWallet('sv-two', 'AddrY', '2');
  const S3 = seedVaultWallet('sv-three', 'AddrZ', '2');
  const SC = seedVaultWallet('sv-new', 'AddrY', '9');
  const released: string[] = [];

  const prepare = async () => {
    await seed([A]);
    const view = await mount();
    await seed([A, S1, S2, S3]);
    released.length = 0;
    (await import('../blockchain/solana/seed-vault-signer')).registerSeedVault({
      bridge: { signTransactions: vi.fn(), signMessages: vi.fn() },
      maxPerRequest: 3,
      release: (token) => released.push(token),
    });
    return view;
  };
  const change: Change = (view) => actions(view).addAccount(SC);

  /** One wallet for the address, every listed id unlockable, no token given up while in use. */
  async function expectReplaceSettled(label: string): Promise<void> {
    const ids = storedIds();
    const secrets = await storedSecrets();
    expect(secrets, label).not.toBeNull();
    for (const id of ids) expect(secrets?.[id], label).toBeDefined();
    expect(ids, label).toEqual(expect.arrayContaining([A.id, S3.id]));
    expect(
      ids.filter((id) => [S1.id, S2.id, SC.id].includes(id)),
      label
    ).toEqual(ids.includes(SC.id) ? [SC.id] : [S1.id, S2.id]);
    const tokensInUse = Object.values(secrets ?? {}).flatMap((secret) =>
      typeof secret === 'object' && (secret as { kind?: string }).kind === 'seedVault'
        ? [(secret as { authToken: string }).authToken]
        : []
    );
    for (const token of released) expect(tokensInUse, label).not.toContain(token);
  }

  it('replaces both, drops their entries after the list, and gives up only the unused token', async () => {
    const view = await prepare();
    const mark = crash.writes.length;

    await act(() => change(view));

    const keys = crash.writes.slice(mark).map(({ key }) => key);
    expect(keys.indexOf(MNEMONICS)).toBeLessThan(keys.indexOf(ACCOUNTS));
    expect(keys.lastIndexOf(MNEMONICS)).toBeGreaterThan(keys.indexOf(ACCOUNTS));
    expect(storedIds()).toEqual([A.id, S3.id, SC.id]);
    expect(await storedSecrets()).toEqual(secretsOf([A, S3, SC]));
    expect(heldIds(view)).toEqual([A.id, SC.id]);
    expect(released).toEqual(['1']);
  });

  it('leaves one wallet for the address, whichever write fails', async () => {
    silence();
    const keys = await cleanRun(prepare, change);

    for (let n = 1; n <= keys.length; n += 1) {
      const label = `fail at write ${n} (${keys[n - 1]})`;
      await restart();
      const view = await prepare();
      crash.failAt(n);

      await attempt(() => change(view));

      await expectReplaceSettled(label);
      await act(() => change(view));
      await expectReplaceSettled(`${label}, then a retry`);
      expect(storedIds(), label).toContain(SC.id);
    }
  });

  it('leaves one wallet for the address, whichever write is the last to land', async () => {
    silence();
    const keys = await cleanRun(prepare, change);

    for (let n = 0; n < keys.length; n += 1) {
      const label = `killed after write ${n}`;
      await restart();
      const view = await prepare();
      crash.killAfter(n);
      await attempt(() => change(view));
      cleanup();
      await crash.relaunch({ keepStash: true });

      const relaunched = await mount();

      await expectReplaceSettled(label);
      expect(heldIds(relaunched), label).toEqual(storedIds());
      await act(() => change(relaunched));
      await expectReplaceSettled(`${label}, then a retry`);
      expect(storedIds(), label).toContain(SC.id);
    }
  });
});

describe('the duplicate check against storage', () => {
  it('refuses, in a stale window, a wallet another window stored under another id', async () => {
    await seed([A, B]);
    const stale = await mount();
    const staleHelpers = (await runtime()).helpers;
    await crash.relaunch({ keepStash: true });
    const other = await mount();
    await act(() => actions(other).addAccount(D));

    const error = await attempt(() => actions(stale).addAccount({ ...D, id: 'id-delta-again' }));

    expect(error).toBeInstanceOf(staleHelpers.DuplicateAccountError);
    expect(storedIds()).toEqual([A.id, B.id, D.id]);
    expect(Object.keys((await storedSecrets()) ?? {})).not.toContain('id-delta-again');
  });

  it('refuses the same phrase from a new screen after a save whose read-back failed', async () => {
    const keys = await cleanRun(
      () => listed([A, B]),
      (view) => actions(view).addAccount(C)
    );
    const view = await listed([A, B]);
    const { helpers } = await runtime();
    crash.failAt(keys.indexOf(ACCOUNTS) + 1, { applied: true });
    // The save's own list read passes; the read-back after the throw fails.
    crash.failRead(ACCOUNTS, { at: 2 });
    expect(await attempt(() => actions(view).addAccount(C))).toBeInstanceOf(Error);

    const error = await attempt(() => actions(view).addAccount({ ...C, id: 'id-gamma-again' }));

    expect(error).toBeInstanceOf(helpers.DuplicateAccountError);
    expect(storedIds()).toEqual([A.id, B.id, C.id]);
  });

  // Guards: a save removes no vault entry, whatever it looks like.
  it('keeps an unlisted copy, the same phrase spaced otherwise, and another phrase', async () => {
    const copy = { ...C, id: 'id-copy' };
    const spaced = wallet('spaced', '  phrase  of   gamma ');
    const other = wallet('other');
    await seed([A, B], { vault: [A, B, copy, spaced, other] });
    const view = await mount();

    await act(() => actions(view).addAccount(C));

    expect(await storedSecrets()).toEqual(secretsOf([A, B, copy, spaced, other, C]));
  });

  it("keeps a listed wallet's entry when the list reads absent with nothing open", async () => {
    await seed([A]);
    crash.dropRead(ACCOUNTS);
    const view = await mount();
    expect(heldIds(view)).toEqual([]);

    await act(() => actions(view).addAccount(C));

    expect(await storedSecrets()).toMatchObject(secretsOf([A, C]));
  });

  it('asks nothing of the network while saving', async () => {
    const view = await listed([A, B]);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const watched: Account = {
      ...wallet('watched'),
      secret: { kind: 'watchOnly', address: 'AddrW', networkId: NETWORK },
    };

    await act(() => actions(view).addAccount(watched));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storedIds()).toContain(watched.id);
  });
});

describe('backup-pending marks', () => {
  const MARKS = 'salmon_unconfirmed_phrases';
  /** A mark no stored wallet carries, left by a save that failed or stopped. */
  const GHOST = 'id-ghost-7f3';

  const marks = () => crash.snapshot()[MARKS] as string[] | undefined;

  async function writeMarks(ids: string[]): Promise<void> {
    const { storage } = await runtime();
    await storage.setStorageItem(MARKS, ids);
  }

  const unconfirmed = (view: View, account: Account, password?: string) =>
    actions(view).addAccount(account, password, { unconfirmed: true });

  it('marks a wallet saved by a save killed right after its list, and the next save prunes a stale mark', async () => {
    const prepare = async () => {
      const view = await listed([A, B]);
      await writeMarks([GHOST]);
      return view;
    };
    const keys = await cleanRun(prepare, (view) => unconfirmed(view, C, 'P1'));
    const view = await prepare();
    crash.killAfter(keys.indexOf(ACCOUNTS) + 1);
    await attempt(() => unconfirmed(view, C, 'P1'));
    cleanup();
    await crash.relaunch({ keepStash: true });
    expect(storedIds()).toContain(C.id);
    expect(marks()).toContain(C.id);

    const relaunched = await mount();
    await act(() => actions(relaunched).addAccount(D));

    expect(marks()).toEqual([C.id]);
  });

  it('keeps a mark a stored wallet carries as the wallet it was derived from', async () => {
    await seed([A, B]);
    const { storage } = await runtime();
    await storage.setStorageItem(ACCOUNTS, [stored(A), { ...stored(B), derivedFrom: 'id-parent' }]);
    await writeMarks(['id-parent', GHOST]);
    const view = await mount();

    await act(() => actions(view).addAccount(C));

    expect(marks()).toEqual(['id-parent']);
  });

  it("keeps another window's mark for a wallet it stored", async () => {
    await seed([A, B]);
    const stale = await mount();
    await crash.relaunch({ keepStash: true });
    const other = await mount();
    await act(() => unconfirmed(other, D));
    await writeMarks([...(marks() ?? []), GHOST]);

    await act(() => actions(stale).addAccount(C));

    expect(marks()).toEqual([D.id]);
  });

  it('writes no mark when none is stale', async () => {
    const view = await listed([A, B]);
    await writeMarks([A.id]);
    const mark = crash.writes.length;

    await act(() => actions(view).addAccount(C));

    expect(crash.writes.slice(mark).map(({ key }) => key)).not.toContain(MARKS);
    expect(marks()).toEqual([A.id]);
  });

  it('resolves when pruning a stale mark fails', async () => {
    const prepare = async () => {
      const view = await listed([A, B]);
      await writeMarks([GHOST]);
      return view;
    };
    const change: Change = (view) => actions(view).addAccount(C);
    const keys = await cleanRun(prepare, change);
    expect(keys).toContain(MARKS);
    const view = await prepare();
    silence();
    crash.failAt(keys.lastIndexOf(MARKS) + 1);

    expect(await attempt(() => change(view))).toBeUndefined();

    expect(storedIds()).toContain(C.id);
    expect(marks()).toEqual([GHOST]);
  });

  it('keeps the mark of a save that failed before its list, and a retry leaves one mark', async () => {
    const keys = await cleanRun(mount, (view) => unconfirmed(view, C, 'P1'));
    const view = await mount();
    crash.failAt(keys.indexOf(MNEMONICS) + 1);

    expect(await attempt(() => unconfirmed(view, C, 'P1'))).toBeInstanceOf(Error);
    expect(marks()).toEqual([C.id]);

    await act(() => unconfirmed(view, C, 'P1'));

    expect(storedIds()).toEqual([C.id]);
    expect(marks()).toEqual([C.id]);
  });
});
