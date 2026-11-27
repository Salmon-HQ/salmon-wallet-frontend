/**
 * @vitest-environment jsdom
 *
 * The password change, the upgrade of an outdated vault at unlock and the
 * migration of a v2 record at unlock each rewrite the vault. They take the
 * turn every wallet save takes: while a save holds it they write nothing, and
 * once it ends they work on what the save left, not on what they read before.
 * Each test runs the real `useAccounts` over the crash double.
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCrashStorage, type CrashStorage } from '../test-utils/crash-storage';
import type { LockedVault } from '../crypto/encryption';
import type { Account, StoredAccount } from '../types/account';

vi.mock('../crypto/encryption', async (importOriginal) =>
  (await import('../test-utils/crash-storage')).keySensitiveCipher(
    await importOriginal<typeof import('../crypto/encryption')>()
  )
);

vi.mock('./useAccountsConnection', () => ({ useAccountsConnection: () => undefined }));

vi.mock('../utils/account', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/account')>()),
  createBlockchainAccountForNetwork: vi.fn(async () => null),
}));

const ACCOUNTS = 'salmon_accounts';
const MNEMONICS = 'salmon_mnemonics';
const WALLETS = 'salmon_wallets';
const WALLET_KEYS = [ACCOUNTS, MNEMONICS, WALLETS, 'salmon_account_counter'];

const wallet = (name: string): Account => ({
  id: `id-${name}`,
  name: `name-${name}`,
  avatar: 'default',
  secret: { kind: 'mnemonic', mnemonic: `phrase of ${name}` },
  pathIndexes: {},
  networksAccounts: {},
});

const A = wallet('alpha');
const B = wallet('beta');
const C = wallet('gamma');

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

const runtime = async () => ({
  storage: await import('../storage'),
  helpers: await import('./useAccountsMutationHelpers'),
  encryption: await import('../crypto/encryption'),
  throttle: await import('../utils/unlock-throttle'),
});

/** Stores the list and a vault of `wallets` under `password`, sealed with `iterations`. */
async function store(wallets: Account[], password: string, iterations?: number): Promise<void> {
  const { storage, encryption } = await runtime();
  await storage.setStorageItem(ACCOUNTS, wallets.map(stored));
  const { vault } = await encryption.lockAndGetKey(
    secretsOf(wallets),
    password,
    iterations ? { iterations } : {}
  );
  await storage.setStorageItem(MNEMONICS, { ...vault, isEncrypted: true });
}

async function mount() {
  const { useAccounts } = await import('./useAccounts');
  const view = renderHook(() => useAccounts());
  await waitFor(() => expect(view.result.current[0].ready).toBe(true));
  return view;
}

async function vaultUnder(password: string): Promise<{ vault: LockedVault; secrets: unknown }> {
  const { storage, encryption } = await runtime();
  const vault = (await storage.getStorageItem<LockedVault>(MNEMONICS)) as LockedVault;
  return { vault, secrets: await encryption.unlock(vault, password) };
}

/**
 * Starts `change` while a save holds the write turn, checks it writes no
 * wallet record until the save ends, then lets the save land and the change
 * finish.
 */
async function whileASaveRuns<T>(save: () => Promise<void>, change: () => Promise<T>): Promise<T> {
  const { helpers } = await runtime();
  let end!: () => void;
  const held = new Promise<void>((resolve) => (end = resolve));
  let begun!: () => void;
  const begins = new Promise<void>((resolve) => (begun = resolve));
  const turn = helpers.withVaultWriteLock(async () => {
    begun();
    await held;
    await save();
  });
  await begins;

  const mark = crash.writes.length;
  const pending = change();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(crash.writes.slice(mark).filter(({ key }) => WALLET_KEYS.includes(key))).toEqual([]);

  let result!: T;
  await act(async () => {
    end();
    await turn;
    result = await pending;
  });
  return result;
}

/** The extension's Web Locks lock: one holder at a time, not reentrant. */
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each([
  ['the extension, with the Web Locks API', 'extension', () => ({ locks: exclusiveLocks() })],
  ['mobile, with the queue of its one runtime', 'mobile', () => ({})],
] as const)('vault writers outside a wallet save take the same turn on %s', (_, platform, nav) => {
  beforeEach(async () => {
    vi.stubGlobal('navigator', nav());
    crash = await startCrashStorage({ platform });
    await crash.relaunch();
  });

  it('a password change waits for the save and keeps the wallet it added', async () => {
    await store([A, B], 'P1');
    const view = await mount();

    const changed = await whileASaveRuns(
      () => store([A, B, C], 'P1'),
      () => view.result.current[1].changePassword('P1', 'P2')
    );

    expect(changed).toBe(true);
    expect((await vaultUnder('P2')).secrets).toEqual(secretsOf([A, B, C]));
  });

  it('the upgrade of an outdated vault at unlock waits for the save and keeps the wallet it added', async () => {
    await store([A, B], 'P1', 1000);
    const view = await mount();
    const { encryption } = await runtime();

    const unlocked = await whileASaveRuns(
      () => store([A, B, C], 'P1', 1000),
      () => view.result.current[1].unlockAccounts('P1')
    );

    expect(unlocked).toBe(true);
    const { vault, secrets } = await vaultUnder('P1');
    expect(vault.iterations).toBe(encryption.DEFAULT_ITERATIONS);
    expect(secrets).toEqual(secretsOf([A, B, C]));
    expect(view.result.current[0].accounts.map(({ id }) => id)).toEqual([A.id, B.id, C.id]);
  });

  it('the migration of a v2 record at unlock waits for the turn', async () => {
    const { storage, encryption } = await runtime();
    await storage.setStorageItem(WALLETS, {
      passwordRequired: true,
      wallets: [{ address: 'address-alpha', path: "m/44'/501'/0'/0'", chain: 'solana' }],
      mnemonics: await encryption.lock({ 'address-alpha': 'phrase of alpha' }, 'P1'),
      lastNumber: 1,
    });
    const view = await mount();

    const unlocked = await whileASaveRuns(
      async () => undefined,
      () => view.result.current[1].unlockAccounts('P1')
    );

    expect(unlocked).toBe(true);
    expect(Object.values((await vaultUnder('P1')).secrets as object)).toEqual(['phrase of alpha']);
    expect(await storage.getStorageItem(WALLETS)).toBeNull();
  });

  it('the migration at unlock leaves a vault another window wrote meanwhile', async () => {
    const { storage, encryption } = await runtime();
    await storage.setStorageItem(WALLETS, {
      passwordRequired: true,
      wallets: [{ address: 'address-alpha', path: "m/44'/501'/0'/0'", chain: 'solana' }],
      mnemonics: await encryption.lock({ 'address-alpha': 'phrase of alpha' }, 'P1'),
      lastNumber: 1,
    });
    const view = await mount();

    const unlocked = await whileASaveRuns(
      () => store([A, B], 'P1'),
      () => view.result.current[1].unlockAccounts('P1')
    );

    expect(unlocked).toBe(true);
    expect((await vaultUnder('P1')).secrets).toEqual(secretsOf([A, B]));
    expect(view.result.current[0].accounts.map(({ id }) => id)).toEqual([A.id, B.id]);
  });

  it('an unlock that waited sees the penalty earned while it waited', async () => {
    await store([A, B], 'P1');
    const view = await mount();
    const { throttle } = await runtime();

    const unlocked = await whileASaveRuns(
      async () => {
        for (let n = 0; n <= throttle.UNLOCK_FREE_ATTEMPTS; n++)
          await throttle.recordFailedUnlock();
      },
      () => view.result.current[1].unlockAccounts('P1')
    );

    expect(unlocked).toBe(false);
    expect(view.result.current[0].error).toBe('unlock-throttled');
    expect(view.result.current[0].locked).toBe(true);
  });

  it('a wrong password costs one attempt and ends the turn', async () => {
    await store([A, B], 'P1');
    const view = await mount();
    const { throttle, helpers } = await runtime();

    let unlocked: boolean | undefined;
    await act(async () => {
      unlocked = await view.result.current[1].unlockAccounts('wrong');
    });

    expect(unlocked).toBe(false);
    expect((await throttle.getUnlockPenalty()).failedAttempts).toBe(1);
    await expect(helpers.withVaultWriteLock(async () => 'next')).resolves.toBe('next');
  });

  it('derives the wallets after the turn, from the list the turn read', async () => {
    const { storage, helpers } = await runtime();
    await store([A, B], 'P1');
    await storage.setStorageItem(ACCOUNTS, [
      { ...stored(A), pathIndexes: { 'solana-mainnet': [0] } },
      stored(B),
    ]);
    const view = await mount();
    const { createBlockchainAccountForNetwork } = await import('../utils/account');
    vi.mocked(createBlockchainAccountForNetwork).mockImplementationOnce(async () => {
      await helpers.withVaultWriteLock(() => store([A, B, C], 'P1'));
      return null;
    });

    let unlocked: boolean | undefined;
    await act(async () => {
      unlocked = await view.result.current[1].unlockAccounts('P1');
    });

    expect(unlocked).toBe(true);
    expect(view.result.current[0].accounts.map(({ id }) => id)).toEqual([A.id, B.id]);
    expect((await vaultUnder('P1')).secrets).toEqual(secretsOf([A, B, C]));
  });

  it('a password change that waited reports the wait earned meanwhile, not a wrong password', async () => {
    await store([A, B], 'P1');
    const view = await mount();
    const { throttle } = await runtime();

    const change = whileASaveRuns(
      async () => {
        for (let n = 0; n <= throttle.UNLOCK_FREE_ATTEMPTS; n++) {
          await throttle.recordFailedUnlock();
        }
      },
      () => view.result.current[1].changePassword('P1', 'P2')
    );

    await expect(change).rejects.toBeInstanceOf(throttle.UnlockThrottledError);
    expect((await vaultUnder('P1')).secrets).toEqual(secretsOf([A, B]));
  });

  it('a password change checks the password against the vault it rewrites', async () => {
    await store([A, B], 'P1');
    const view = await mount();
    const { throttle } = await runtime();

    const changed = await whileASaveRuns(
      () => store([A, B], 'P3'),
      () => view.result.current[1].changePassword('P1', 'P2')
    );

    expect(changed).toBe(false);
    expect((await vaultUnder('P3')).secrets).toEqual(secretsOf([A, B]));
    expect((await throttle.getUnlockPenalty()).failedAttempts).toBe(1);
  });
});
