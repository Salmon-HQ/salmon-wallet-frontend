/**
 * @vitest-environment jsdom
 *
 * Removing or editing a wallet changes the window only after the list is
 * stored, and "Remove all" lets the key go before storage and leaves nothing
 * that would refuse the next setup. Each case runs the real `useAccounts` in
 * a fresh runtime over the crash double; the sweeps walk the write log of a
 * clean run of the same change.
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCrashStorage, type CrashStorage } from '../test-utils/crash-storage';
import type { Account, StoredAccount } from '../types/account';

vi.mock('../crypto/encryption', async (importOriginal) =>
  (await import('../test-utils/crash-storage')).keySensitiveCipher(
    await importOriginal<typeof import('../crypto/encryption')>()
  )
);

// The connection record follows the active wallet on every render; it is not
// a wallet record and would only add writes to the logs these tests read.
vi.mock('./useAccountsConnection', () => ({ useAccountsConnection: () => undefined }));

// Loading a wallet derives no address here: the catalog lives on the network.
vi.mock('../utils/account', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/account')>()),
  createBlockchainAccountForNetwork: vi.fn(async () => null),
}));

const ACCOUNTS = 'salmon_accounts';
const MNEMONICS = 'salmon_mnemonics';
const COUNTER = 'salmon_account_counter';
const WALLETS = 'salmon_wallets';
const ACCOUNT_ID = 'salmon_active_account_id';
const NETWORK_ID = 'salmon_active_network_id';
const PATH_INDEX = 'salmon_active_path_index';
const DERIVED_KEY = 'derived_key_cache';
const NETWORK = 'solana-mainnet';

const wallet = (name: string): Account => ({
  id: `id-${name}-7f3`,
  name: `name-${name}`,
  avatar: 'default',
  secret: { kind: 'mnemonic', mnemonic: `phrase of ${name}` },
  pathIndexes: { [NETWORK]: [0] },
  networksAccounts: {},
});

const A = wallet('alpha');
const B = wallet('beta');
const C = wallet('gamma');

const stored = ({ id, name, avatar }: Account): StoredAccount => ({
  id,
  name,
  avatar,
  pathIndexes: { [NETWORK]: [0] },
});

const secretsOf = (wallets: Account[]) =>
  Object.fromEntries(
    wallets.map(({ id, secret }) => [id, (secret as { mnemonic: string }).mnemonic])
  );

let crash: CrashStorage;

const runtime = async () => ({
  storage: await import('../storage'),
  encryption: await import('../crypto/encryption'),
});

/** A and B listed, A active, a vault under P1 whose key is cached; with `legacy`, a v2 record too. */
async function seed({ legacy = false }: { legacy?: boolean } = {}): Promise<void> {
  const { storage, encryption } = await runtime();
  await storage.setStorageItem(ACCOUNTS, [A, B].map(stored));
  await storage.setStorageItem(COUNTER, 2);
  await storage.setStorageItem(ACCOUNT_ID, A.id);
  await storage.setStorageItem(NETWORK_ID, NETWORK);
  await storage.setStorageItem(PATH_INDEX, 0);
  if (legacy) await storage.setStorageItem(WALLETS, { passwordRequired: true, wallets: [] });
  const { vault, keyCache } = await encryption.lockAndGetKey(secretsOf([A, B]), 'P1');
  await storage.setStorageItem(MNEMONICS, { ...vault, isEncrypted: true });
  await storage.setStashItem(DERIVED_KEY, keyCache);
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
const heldNames = (view: View) => view.result.current[0].accounts.map(({ name }) => name);
const storedList = () => (crash.snapshot()[ACCOUNTS] as StoredAccount[] | undefined) ?? [];
const storedIds = () => storedList().map(({ id }) => id);

async function storedSecrets(): Promise<Record<string, unknown> | null> {
  const { encryption } = await runtime();
  const vault = crash.snapshot()[MNEMONICS];
  if (!vault) return null;
  return encryption.unlock(vault as Parameters<typeof encryption.unlock>[0], 'P1');
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
  crash = await startCrashStorage();
  await crash.relaunch();
}

async function cleanRun(change: Change): Promise<string[]> {
  await seed();
  const view = await mount();
  const mark = crash.writes.length;
  await act(async () => {
    await change(view);
  });
  const keys = crash.writes.slice(mark).map(({ key }) => key);
  await restart();
  return keys;
}

const silence = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

beforeEach(async () => {
  crash = await startCrashStorage();
  await crash.relaunch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Every listed id has its entry, and the stored active wallet, when listed, sits on a slot it holds. */
async function expectEntriesAndSlot(label: string): Promise<void> {
  const secrets = await storedSecrets();
  for (const id of storedIds())
    expect(secrets?.[id], `${label}: entry of a listed id`).toBeDefined();
  const snapshot = crash.snapshot();
  const active = storedList().find(({ id }) => id === snapshot[ACCOUNT_ID]);
  if (active) {
    const slot = snapshot[PATH_INDEX] as number;
    expect(active.pathIndexes[snapshot[NETWORK_ID] as string]?.[slot], label).toBe(slot);
  }
}

describe.each([
  ['a wallet that is not active', B],
  ['the active wallet', A],
])('removing %s', (_label, target) => {
  const change: Change = (view) => actions(view).removeAccount(target.id);

  it('changes the window only after the list is stored, whichever write fails', async () => {
    silence();
    const keys = await cleanRun(change);

    for (let n = 1; n <= keys.length; n += 1) {
      const label = `fail at write ${n} (${keys[n - 1]})`;
      await restart();
      await seed();
      const view = await mount();
      crash.failAt(n);

      await attempt(() => change(view));

      expect(heldIds(view), label).toEqual(storedIds());
      expect(storedIds(), label).toContain(view.result.current[0].accountId);
      await expectEntriesAndSlot(label);
    }
  });

  it('leaves listed wallets that unlock, whichever write is the last to land', async () => {
    silence();
    const keys = await cleanRun(change);

    for (let n = 0; n < keys.length; n += 1) {
      const label = `killed after write ${n}`;
      await restart();
      await seed();
      const view = await mount();
      crash.killAfter(n);
      await attempt(() => change(view));
      cleanup();
      await crash.relaunch({ keepStash: true });

      const relaunched = await mount();

      expect(heldIds(relaunched), label).toEqual(storedIds());
      expect(storedIds(), label).toContain(relaunched.result.current[0].accountId);
      await expectEntriesAndSlot(label);
    }
  });

  it('rejects with the wallet gone from the window and the list when the vault write fails', async () => {
    const keys = await cleanRun(change);
    await seed();
    const view = await mount();
    crash.failAt(keys.indexOf(MNEMONICS) + 1);

    expect(await attempt(() => change(view))).toBeInstanceOf(Error);

    expect(heldIds(view)).not.toContain(target.id);
    expect(storedIds()).not.toContain(target.id);
    expect(await storedSecrets()).toEqual(secretsOf([A, B]));
  });
});

describe('editing a wallet', () => {
  const change: Change = (view) => actions(view).editAccount(A.id, { name: 'renamed' });

  it('shows the old name after a rename whose list write failed', async () => {
    const keys = await cleanRun(change);
    await seed();
    const view = await mount();
    crash.failAt(keys.indexOf(ACCOUNTS) + 1);

    expect(await attempt(() => change(view))).toBeInstanceOf(Error);

    expect(heldNames(view)).toEqual([A.name, B.name]);
    expect(storedList().map(({ name }) => name)).toEqual([A.name, B.name]);
  });

  it('agrees with the next launch, whichever write is the last to land', async () => {
    const keys = await cleanRun(change);

    for (let n = 0; n <= keys.length; n += 1) {
      const label = `killed after write ${n}`;
      await restart();
      await seed();
      const view = await mount();
      crash.killAfter(n);
      await attempt(() => change(view));
      const before = heldNames(view);
      cleanup();
      await crash.relaunch({ keepStash: true });

      const relaunched = await mount();

      expect(heldNames(relaunched), label).toEqual(before);
    }
  });
});

// Another window swapped B for C in storage; this one still holds A and B.
describe('changing a wallet from a window that missed another one', () => {
  async function stale(): Promise<View> {
    await seed();
    const view = await mount();
    const { storage } = await runtime();
    await storage.setStorageItem(ACCOUNTS, [A, C].map(stored));
    return view;
  }

  it('hands the session to a wallet the window holds and leaves the list unmarked when removing the active wallet', async () => {
    const view = await stale();
    const helpers = await import('./useAccountsMutationHelpers');

    await act(() => actions(view).removeAccount(A.id));

    expect(storedIds()).toEqual([C.id]);
    expect(heldIds(view)).toContain(view.result.current[0].accountId);
    expect(helpers.isOwnStoredAccountsWrite([C.id])).toBe(false);
  });

  it('leaves the list unmarked after an edit', async () => {
    const view = await stale();
    const helpers = await import('./useAccountsMutationHelpers');

    await act(() => actions(view).editAccount(A.id, { name: 'renamed' }));

    expect(storedList().map(({ name }) => name)).toEqual(['renamed', C.name]);
    expect(helpers.isOwnStoredAccountsWrite([A.id, C.id])).toBe(false);
  });
});

describe('removing every wallet', () => {
  const change: Change = (view) => actions(view).removeAllAccounts();

  const stashedKey = async () => (await runtime()).storage.getStashItem(DERIVED_KEY);

  it('removes the records in an order that leaves no witness without the vault', async () => {
    const keys = await cleanRun(change);

    expect(keys).toEqual([
      COUNTER,
      WALLETS,
      'salmon_active',
      'salmon_endpoints',
      ACCOUNT_ID,
      NETWORK_ID,
      PATH_INDEX,
      ACCOUNTS,
      MNEMONICS,
      'salmon_trusted_apps',
      'salmon_custom_tokens',
      'salmon_connection',
    ]);
  });

  it('touches no storage when the session key cannot be dropped, with memory already cleared', async () => {
    await seed();
    const view = await mount();
    const before = crash.snapshot();
    crash.failStashAt(1);

    expect(await attempt(() => change(view))).toBeInstanceOf(Error);

    expect(crash.snapshot()).toEqual(before);
    expect(heldIds(view)).toEqual([]);
  });

  it('has dropped the session key and memory before any storage write fails', async () => {
    const keys = await cleanRun(change);

    for (let n = 1; n <= keys.length; n += 1) {
      const label = `fail at write ${n} (${keys[n - 1]})`;
      await restart();
      await seed();
      const view = await mount();
      crash.failAt(n);

      await attempt(() => change(view));

      expect(await stashedKey(), label).toBeUndefined();
      expect(heldIds(view), label).toEqual([]);
    }
  });

  it('lets a setup through after a reset killed after any of its writes', async () => {
    const keys = await cleanRun(change);

    for (let n = 0; n < keys.length; n += 1) {
      const label = `killed after write ${n} (${keys[n - 1] ?? 'none'})`;
      await restart();
      await seed({ legacy: true });
      const view = await mount();
      crash.killAfter(n);
      await attempt(() => change(view));
      cleanup();
      await crash.relaunch();

      const relaunched = await mount();

      if (storedIds().length > 0) {
        // Stopped before the list: the wallets still load, behind the lock.
        expect(heldIds(relaunched), label).toEqual([A.id, B.id]);
        expect(await storedSecrets(), label).toEqual(secretsOf([A, B]));
        continue;
      }
      // A vault left with no list opens with its own password; with none, any.
      const password = crash.snapshot()[MNEMONICS] ? 'P1' : 'P-new';
      expect(
        await attempt(() => actions(relaunched).addAccount(C, password)),
        label
      ).toBeUndefined();
      expect(storedIds(), label).toEqual([C.id]);
    }
  });
});
