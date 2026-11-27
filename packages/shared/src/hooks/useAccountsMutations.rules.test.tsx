/**
 * @vitest-environment jsdom
 *
 * The rules every wallet change follows before and at its deciding write: it
 * refuses to write on a read that contradicts the rest of storage (Rule 1), a
 * supplied password must open the stored vault, and a list write that throws
 * is settled by reading it back on the extension and is a failed write on
 * mobile (Rule 2). Each test runs the real `useAccounts` in a fresh runtime
 * over the crash double.
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCrashStorage, type CrashStorage } from '../test-utils/crash-storage';
import type { Platform } from '../storage/types';
import type { Account, StoredAccount } from '../types/account';

/**
 * Runs when a change seals its new vault: after its first reads and before its
 * list write, which is where a fault that must spare those reads is armed.
 */
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
  };
});

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
const DERIVED_KEY = 'derived_key_cache';
const WALLET_KEYS = [
  ACCOUNTS,
  MNEMONICS,
  COUNTER,
  'salmon_active_account_id',
  'salmon_active_network_id',
  'salmon_active_path_index',
  'salmon_unconfirmed_phrases',
];

const wallet = (name: string): Account => ({
  id: `id-${name}-7f3`,
  name: `name-${name}`,
  avatar: 'default',
  secret: { kind: 'mnemonic', mnemonic: `phrase of ${name}` },
  pathIndexes: {},
  networksAccounts: {},
});

const A = wallet('alpha');
const B = wallet('beta');
const C = wallet('gamma');

/** Words that would leak a wallet into a message: its id, its name, its secret. */
const LEAKS = ['alpha', 'beta', 'gamma', 'phrase', '7f3'];

const stored = ({ id, name, avatar }: Account): StoredAccount => ({
  id,
  name,
  avatar,
  pathIndexes: {},
});

const secretsOf = (wallets: Account[]) =>
  Object.fromEntries(
    wallets.map(({ id, secret }) => [id, (secret as { mnemonic: string }).mnemonic])
  );

let crash: CrashStorage;

/** The modules of the runtime the code under test runs in now. */
const runtime = async () => ({
  storage: await import('../storage'),
  helpers: await import('./useAccountsMutationHelpers'),
  encryption: await import('../crypto/encryption'),
  throttle: await import('../utils/unlock-throttle'),
});

/** The listed wallets with their selection, and a vault under `password` whose key is cached. */
async function seed(
  listed: Account[],
  { vault = listed, password = 'P1', cacheKey = true }: SeedOptions = {}
): Promise<void> {
  const { storage, encryption } = await runtime();
  if (listed.length > 0) {
    await storage.setStorageItem(ACCOUNTS, listed.map(stored));
    await storage.setStorageItem(COUNTER, listed.length);
    await storage.setStorageItem('salmon_active_account_id', listed[0].id);
    await storage.setStorageItem('salmon_active_network_id', 'solana-mainnet');
    await storage.setStorageItem('salmon_active_path_index', 0);
  }
  if (!vault) return;
  const { vault: locked, keyCache } = await encryption.lockAndGetKey(secretsOf(vault), password);
  await storage.setStorageItem(MNEMONICS, { ...locked, isEncrypted: true });
  if (cacheKey) await storage.setStashItem(DERIVED_KEY, keyCache);
}

interface SeedOptions {
  vault?: Account[] | null;
  password?: string;
  cacheKey?: boolean;
}

async function mount() {
  const { useAccounts } = await import('./useAccounts');
  const view = renderHook(() => useAccounts());
  await waitFor(() => expect(view.result.current[0].ready).toBe(true));
  return view;
}

type View = Awaited<ReturnType<typeof mount>>;

const actions = (view: View) => view.result.current[1];
const heldIds = (view: View) => view.result.current[0].accounts.map(({ id }) => id);
const heldNames = (view: View) => view.result.current[0].accounts.map(({ name }) => name);
const listNames = (list: unknown) => (list as StoredAccount[]).map(({ name }) => name);

const walletRecords = () =>
  Object.fromEntries(Object.entries(crash.snapshot()).filter(([key]) => WALLET_KEYS.includes(key)));

/** Runs a change that must be refused before it writes any wallet record. */
async function refused(change: () => Promise<unknown>): Promise<Error> {
  const before = walletRecords();
  const mark = crash.writes.length;
  let error: unknown;
  await act(async () => {
    try {
      await change();
    } catch (err) {
      error = err;
    }
  });
  expect(error).toBeInstanceOf(Error);
  expect(crash.writes.slice(mark).filter(({ key }) => WALLET_KEYS.includes(key))).toEqual([]);
  expect(walletRecords()).toEqual(before);
  return error as Error;
}

/** Rule 1 refuses with a `VaultReadRefusedError` that names no wallet. */
async function expectRuleOne(error: Error): Promise<void> {
  expect(error).toBeInstanceOf((await runtime()).helpers.VaultReadRefusedError);
  expect(error.name).toBe('VaultReadRefusedError');
  for (const word of LEAKS) expect(error.message).not.toContain(word);
}

/** The platform storage reports: the extension where Web Locks run, mobile where they do not. */
let platform: Platform = 'mobile';

async function start(): Promise<void> {
  crash = await startCrashStorage({ platform });
  await crash.relaunch();
}

afterEach(() => {
  sealing.hook = null;
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Every case below, run once per platform and its kind of write lock. */
function ruleCases(kind: Platform): void {
  describe('Rule 1: a change refuses to write on a read that contradicts the rest', () => {
    it.each(['dropRead', 'garbleRead'] as const)(
      'refuses an add when the vault read is %s while the list names wallets',
      async (fault) => {
        await seed([A, B]);
        const view = await mount();
        crash[fault](MNEMONICS);

        await expectRuleOne(await refused(() => actions(view).addAccount(C)));
        expect(heldIds(view)).toEqual([A.id, B.id]);
      }
    );

    it.each(['dropRead', 'garbleRead'] as const)(
      'refuses a removal when the vault read is %s while the list names wallets',
      async (fault) => {
        await seed([A, B]);
        const view = await mount();
        crash[fault](MNEMONICS);

        await expectRuleOne(await refused(() => actions(view).removeAccount(B.id)));
        expect(heldIds(view)).toEqual([A.id, B.id]);
      }
    );

    it('refuses an add and a removal when the vault reads as an array while the list names wallets', async () => {
      await seed([A, B]);
      const view = await mount();
      const { storage } = await runtime();
      await storage.setStorageItem(MNEMONICS, ['not', 'a', 'vault']);

      await expectRuleOne(await refused(() => actions(view).addAccount(C)));
      await expectRuleOne(await refused(() => actions(view).removeAccount(B.id)));
    });

    it('overwrites a vault stored as an array beside an empty list with a first save', async () => {
      const { storage, encryption } = await runtime();
      await storage.setStorageItem(MNEMONICS, ['not', 'a', 'vault']);
      const view = await mount();

      await act(() => actions(view).addAccount(C, 'P-new'));

      const vault = crash.snapshot()[MNEMONICS] as Parameters<typeof encryption.unlock>[0];
      expect(await encryption.unlock(vault, 'P-new')).toEqual(secretsOf([C]));
    });

    it('refuses an add and a removal when vault and list read absent while the counter is stored', async () => {
      await seed([A, B]);
      crash.dropRead(ACCOUNTS);
      crash.dropRead(MNEMONICS);
      const view = await mount();
      expect(heldIds(view)).toEqual([]);

      await expectRuleOne(await refused(() => actions(view).addAccount(C)));
      await expectRuleOne(await refused(() => actions(view).removeAccount(A.id)));
    });

    it('refuses an add when the vault is absent while a v2 record is stored', async () => {
      const { storage } = await runtime();
      await storage.setStorageItem(WALLETS, { passwordRequired: true, wallets: [] });
      const view = await mount();

      await expectRuleOne(await refused(() => actions(view).addAccount(C, 'P2')));
      expect(crash.snapshot()[WALLETS]).toEqual({ passwordRequired: true, wallets: [] });
    });

    it('refuses an add, a removal and an edit when the list reads absent while memory holds wallets', async () => {
      await seed([A, B]);
      const view = await mount();
      crash.dropRead(ACCOUNTS);

      await expectRuleOne(await refused(() => actions(view).addAccount(C)));
      await expectRuleOne(await refused(() => actions(view).removeAccount(B.id)));
      await expectRuleOne(
        await refused(() => actions(view).editAccount(A.id, { name: 'renamed' }))
      );
      expect(heldIds(view)).toEqual([A.id, B.id]);
      expect(view.result.current[0].accounts[0].name).toBe(A.name);
    });

    it('refuses an add, a removal and an edit before any write when the list is not an array', async () => {
      await seed([A, B]);
      const view = await mount();
      const { storage } = await runtime();
      await storage.setStorageItem(ACCOUNTS, { broken: true });

      await expectRuleOne(await refused(() => actions(view).addAccount(C)));
      await expectRuleOne(await refused(() => actions(view).removeAccount(B.id)));
      await expectRuleOne(
        await refused(() => actions(view).editAccount(A.id, { name: 'renamed' }))
      );
    });

    // Guard: a user who still has the phrase gets back in.
    it('overwrites a garbled vault beside an empty list with a first save, without the password proof', async () => {
      await seed([], { vault: [B], cacheKey: false });
      crash.garbleRead(MNEMONICS);
      const view = await mount();

      await act(() => actions(view).addAccount(C, 'P-new'));

      const { encryption } = await runtime();
      const vault = crash.snapshot()[MNEMONICS] as Parameters<typeof encryption.unlock>[0];
      expect(await encryption.unlock(vault, 'P-new')).toEqual(secretsOf([C]));
      expect(crash.snapshot()[ACCOUNTS]).toEqual([stored(C)]);
    });

    // Guard: an edit never reads the vault.
    it('lets an edit through while the vault read is garbled', async () => {
      await seed([A, B]);
      const view = await mount();
      crash.garbleRead(MNEMONICS);

      await act(() => actions(view).editAccount(A.id, { name: 'renamed' }));

      expect((crash.snapshot()[ACCOUNTS] as StoredAccount[]).map(({ name }) => name)).toEqual([
        'renamed',
        B.name,
      ]);
    });

    // Guard: another window removed that wallet; there is nothing to edit.
    it('writes nothing when an edit finds the list without only that wallet', async () => {
      await seed([A, B]);
      const view = await mount();
      const { storage } = await runtime();
      await storage.setStorageItem(ACCOUNTS, [stored(A)]);
      const mark = crash.writes.length;

      await act(() => actions(view).editAccount(B.id, { name: 'renamed' }));

      expect(crash.writes.slice(mark)).toEqual([]);
    });
  });

  describe('a supplied password must open the stored vault', () => {
    it('refuses an add under another password while a cached key would open the vault', async () => {
      await seed([A, B]);
      const view = await mount();
      const { encryption, throttle } = await runtime();

      const error = await refused(() => actions(view).addAccount(C, 'P2'));

      expect(error).toBeInstanceOf(encryption.IncorrectPasswordError);
      expect((await throttle.getUnlockPenalty()).failedAttempts).toBe(1);
    });

    it('refuses a removal under another password while a cached key would open the vault', async () => {
      await seed([A, B]);
      const view = await mount();
      const { encryption, throttle } = await runtime();

      const error = await refused(() => actions(view).removeAccount(B.id, 'P2'));

      expect(error).toBeInstanceOf(encryption.IncorrectPasswordError);
      expect((await throttle.getUnlockPenalty()).failedAttempts).toBe(1);
    });

    it('refuses a password while a penalty stands, without trying it', async () => {
      await seed([A, B]);
      const view = await mount();
      const { throttle } = await runtime();
      for (let i = 0; i < 4; i += 1) await throttle.recordFailedUnlock();

      const error = await refused(() => actions(view).addAccount(C, 'P1'));

      expect(error).toBeInstanceOf(throttle.UnlockThrottledError);
      expect((await throttle.getUnlockPenalty()).failedAttempts).toBe(4);
    });

    // An extension window opened on the setup screens before another window
    // finished setup with P1: its page asks for a new password.
    it('refuses a stale onboarding window its new password, and saves with the stored one', async () => {
      const first = await mount();
      await crash.relaunch({ keepStash: true });
      const stale = await mount();
      await act(() => actions(first).addAccount(A, 'P1'));
      const { encryption, throttle } = await runtime();

      const error = await refused(() => actions(stale).addAccount(B, 'P2'));
      expect(error).toBeInstanceOf(encryption.IncorrectPasswordError);
      expect((await throttle.getUnlockPenalty()).failedAttempts).toBe(1);

      await act(() => actions(stale).addAccount(B, 'P1'));

      expect((crash.snapshot()[ACCOUNTS] as StoredAccount[]).map(({ id }) => id)).toEqual([
        A.id,
        B.id,
      ]);
      const vault = crash.snapshot()[MNEMONICS] as Parameters<typeof encryption.unlock>[0];
      expect(await encryption.unlock(vault, 'P1')).toEqual(secretsOf([A, B]));
    });

    // A first attempt cached P1's key, then its vault write failed without landing.
    it('seals a first save under the password given now, not a key left by an earlier attempt', async () => {
      const { storage, encryption } = await runtime();
      const { keyCache } = await encryption.lockAndGetKey({}, 'P1');
      await storage.setStashItem(DERIVED_KEY, keyCache);
      const view = await mount();

      await act(() => actions(view).addAccount(C, 'P2'));

      const vault = crash.snapshot()[MNEMONICS] as Parameters<typeof encryption.unlock>[0];
      expect(await encryption.unlock(vault, 'P2')).toEqual(secretsOf([C]));
      await expect(encryption.unlock(vault, 'P1')).rejects.toBeInstanceOf(
        encryption.IncorrectPasswordError
      );
    });

    it('writes nothing when dropping the earlier key fails', async () => {
      const { storage, encryption } = await runtime();
      const { keyCache } = await encryption.lockAndGetKey({}, 'P1');
      await storage.setStashItem(DERIVED_KEY, keyCache);
      const view = await mount();
      crash.failStashAt(1);

      await refused(() => actions(view).addAccount(C, 'P2'));
    });
  });

  type Change = (view: View) => Promise<unknown>;

  /** A fixture, mounted, and the change to run on it. */
  interface Scenario {
    label: string;
    prepare: () => Promise<View>;
    change: Change;
    /** The wallet ids and names the stored list holds once the change landed. */
    after: string[];
  }

  const listed = async (wallets: Account[]) => {
    await seed(wallets);
    return mount();
  };

  const SETUP_CREATE: Scenario = {
    label: 'setup create',
    prepare: mount,
    change: (view) => actions(view).addAccount(A, 'P1'),
    after: [A.name],
  };
  const SETUP_RECOVER: Scenario = {
    label: 'setup recover',
    prepare: mount,
    change: (view) => actions(view).addAccount(B, 'P1'),
    after: [B.name],
  };
  const ADD: Scenario = {
    label: 'Add wallet',
    prepare: () => listed([A, B]),
    change: (view) => actions(view).addAccount(C),
    after: [A.name, B.name, C.name],
  };
  const REMOVE: Scenario = {
    label: 'remove',
    prepare: () => listed([A, B]),
    change: (view) => actions(view).removeAccount(B.id),
    after: [A.name],
  };
  const EDIT: Scenario = {
    label: 'edit',
    prepare: () => listed([A, B]),
    change: (view) => actions(view).editAccount(A.id, { name: 'renamed' }),
    after: ['renamed', B.name],
  };

  /**
   * Where the list write falls in a clean run of the scenario, counted as
   * `failAt` counts. The clean run happens in a runtime of its own, thrown away.
   */
  async function listWritePosition({ prepare, change }: Scenario): Promise<number> {
    const view = await prepare();
    const mark = crash.writes.length;
    await act(async () => {
      await change(view);
    });
    const position = crash.writes.slice(mark).findIndex(({ key }) => key === ACCOUNTS) + 1;
    cleanup();
    await start();
    expect(position).toBeGreaterThan(0);
    return position;
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

  // AsyncStorage on iOS can answer a read with a value whose write failed, so
  // there a read-back proves nothing.
  if (kind === 'mobile') {
    describe('Rule 2 on mobile: a list write that throws is a failed write', () => {
      it.each([ADD, REMOVE, EDIT])(
        'rejects $label when the list write lands and then throws, writing and reading nothing after it',
        async (scenario) => {
          const position = await listWritePosition(scenario);
          const view = await scenario.prepare();
          const before = heldNames(view);
          const { helpers } = await runtime();
          const mark = crash.writes.length;
          crash.failAt(position, { applied: true });

          expect(await attempt(() => scenario.change(view))).toBeInstanceOf(Error);

          // A removal leaves the vault alone: no write follows the list.
          expect(crash.writes.length - mark).toBe(position);
          expect(heldNames(view)).toEqual(before);
          const listReadsAfter = crash.reads.filter(
            ({ key, afterWrites }) => key === ACCOUNTS && afterWrites >= mark + position
          );
          expect(listReadsAfter).toEqual([]);
          const landed = (crash.snapshot()[ACCOUNTS] as StoredAccount[]).map(({ id }) => id);
          expect(helpers.isOwnStoredAccountsWrite(landed)).toBe(false);
        }
      );
    });
    return;
  }

  describe('Rule 2: a list write that throws is settled by reading it back', () => {
    it.each([SETUP_CREATE, SETUP_RECOVER, ADD, REMOVE, EDIT])(
      'resolves $label when the list write lands and then throws',
      async (scenario) => {
        const position = await listWritePosition(scenario);
        const view = await scenario.prepare();
        crash.failAt(position, { applied: true });

        await act(async () => {
          await scenario.change(view);
        });

        expect(listNames(crash.snapshot()[ACCOUNTS])).toEqual(scenario.after);
      }
    );

    it.each([ADD, REMOVE, EDIT])(
      'rejects $label with the write error when the write landed and only the read-back fails, and memory shows the landed change',
      async (scenario) => {
        const position = await listWritePosition(scenario);
        const view = await scenario.prepare();
        const { storage, helpers } = await runtime();
        crash.failAt(position, { applied: true });
        crash.failRead(ACCOUNTS, { at: 2 });

        const error = await attempt(() => scenario.change(view));

        expect(error).toBeInstanceOf(storage.StorageError);
        expect(listNames(crash.snapshot()[ACCOUNTS])).toEqual(scenario.after);
        expect(heldNames(view)).toEqual(scenario.after);
        const landed = (crash.snapshot()[ACCOUNTS] as StoredAccount[]).map(({ id }) => id);
        expect(helpers.isOwnStoredAccountsWrite(landed)).toBe(false);
      }
    );

    it.each([ADD, REMOVE, EDIT])(
      'rejects $label and reloads memory to the state before when the write did not land and the read-back fails',
      async (scenario) => {
        const position = await listWritePosition(scenario);
        const view = await scenario.prepare();
        const before = heldNames(view);
        crash.failAt(position);
        crash.failRead(ACCOUNTS, { at: 2 });
        const mark = crash.writes.length;

        await attempt(() => scenario.change(view));

        expect(heldNames(view)).toEqual(before);
        // The reload writes nothing: only the rows before the list landed.
        expect(crash.writes.length - mark).toBe(position - 1);
        expect(view.result.current[0].error).toBeNull();
        expect(view.result.current[0].locked).toBe(false);
      }
    );

    it.each(['dropRead', 'failRead'] as const)(
      'leaves memory to the change alone when the reload reads the list through a lasting %s',
      async (fault) => {
        const position = await listWritePosition(ADD);
        const view = await ADD.prepare();
        const [held] = view.result.current[0].accounts;
        const { helpers } = await runtime();
        crash.failAt(position, { applied: true });
        sealing.hook = () => crash[fault](ACCOUNTS);

        expect(await attempt(() => ADD.change(view))).toBeInstanceOf(Error);

        expect(view.result.current[0].accounts[0]).toBe(held);
        expect(view.result.current[0].error).toBeNull();
        expect(helpers.isOwnStoredAccountsWrite([A.id, B.id, C.id])).toBe(false);
      }
    );

    it('logs a reload that fails and still rejects with the write error, setting no global error', async () => {
      const position = await listWritePosition(ADD);
      const view = await ADD.prepare();
      const { storage } = await runtime();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      crash.failAt(position);
      sealing.hook = () => crash.failRead(MNEMONICS);

      const error = await attempt(() => ADD.change(view));

      expect(error).toBeInstanceOf(storage.StorageError);
      expect(warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ message: `Read of "${MNEMONICS}" failed` })
      );
      expect(view.result.current[0].error).toBeNull();
    });
  });
}

/**
 * The extension's windows take a Web Locks lock: this one admits one holder at
 * a time and is not reentrant, so a change that asked for it again from inside
 * would hang. jsdom has no `navigator.locks` of its own.
 */
function exclusiveLocks() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    request<T>(_name: string, write: () => Promise<T>): Promise<T> {
      const run = tail.then(write);
      tail = run.catch(() => undefined);
      return run;
    },
  };
}

describe('on the extension, with the Web Locks API', () => {
  beforeEach(async () => {
    vi.stubGlobal('navigator', { locks: exclusiveLocks() });
    platform = 'extension';
    await start();
  });

  ruleCases('extension');

  it('saves a first wallet without asking for the lock again from inside', async () => {
    const view = await mount();

    await act(() => actions(view).addAccount(A, 'P1'));

    expect(listNames(crash.snapshot()[ACCOUNTS])).toEqual([A.name]);
  });
});

// Mobile has no Web Locks API: the changes queue in its one runtime.
describe('on mobile, without navigator.locks', () => {
  beforeEach(async () => {
    vi.stubGlobal('navigator', {});
    platform = 'mobile';
    await start();
  });

  ruleCases('mobile');
});
