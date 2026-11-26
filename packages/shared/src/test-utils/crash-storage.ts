/**
 * Storage that can break the way a device does: a write that throws before or
 * after it lands, a read that throws, comes back empty or comes back corrupt,
 * a stash write that throws, and a relaunch that drops everything held in
 * memory. Runs over the real `initStorage`, so the code under test reads and
 * writes through the same typed storage it uses in the app.
 *
 * One double serves every runtime of a test file: a relaunch gives the code
 * under test fresh modules, and those are pointed at this same storage.
 */
import { vi } from 'vitest';
import type * as Encryption from '../crypto/encryption';
import type {
  DerivedKeyCache,
  DigestAlgorithm,
  LockedVault,
  LockOptions,
} from '../crypto/encryption';
import type { Stash, StorageAdapter } from '../storage/types';

type Snapshot = Record<string, unknown>;

export interface CrashStorage {
  /** The n-th write from now throws; with `applied` it lands first. */
  failAt(n: number, options?: { applied?: boolean }): void;
  /** The n-th stash write from now throws without landing. */
  failStashAt(n: number): void;
  failRead(key: string): void;
  /** Reads of the key come back absent while it stays stored. */
  dropRead(key: string): void;
  /** Reads of the key come back as a string storage cannot parse. */
  garbleRead(key: string): void;
  snapshot(): Snapshot;
  /** Every write that landed, with storage as it stood right after it. */
  writes: { key: string; after: Snapshot }[];
  /** A fresh runtime over the same storage; the stash survives only with `keepStash`. */
  relaunch(options?: { keepStash?: boolean }): Promise<void>;
}

const GARBLED = '{"garbled';

let stored = new Map<string, string>();
let stashed = new Map<string, unknown>();
let writes: CrashStorage['writes'] = [];
let failWrite: { remaining: number; applied: boolean } | null = null;
let failStashRemaining = 0;
let readFaults = new Map<string, 'fail' | 'drop' | 'garble'>();

const parse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const snapshot = (): Snapshot =>
  Object.fromEntries([...stored].map(([key, raw]) => [key, parse(raw)]));

async function write(key: string, apply: () => void): Promise<void> {
  const fault = failWrite && --failWrite.remaining === 0 ? failWrite : null;
  if (fault) failWrite = null;
  if (!fault || fault.applied) {
    apply();
    writes.push({ key, after: snapshot() });
  }
  if (fault) throw new Error(`Write of "${key}" failed`);
}

const adapter: StorageAdapter = {
  getItem: async (key) => {
    const fault = readFaults.get(key);
    if (fault === 'fail') throw new Error(`Read of "${key}" failed`);
    if (fault === 'drop') return null;
    if (fault === 'garble') return GARBLED;
    return stored.get(key) ?? null;
  },
  setItem: (key, value) => write(key, () => stored.set(key, value)),
  removeItem: (key) => write(key, () => stored.delete(key)),
  clear: () => write('*', () => stored.clear()),
};

async function stashWrite(apply: () => void): Promise<void> {
  if (failStashRemaining > 0 && --failStashRemaining === 0) throw new Error('Stash write failed');
  apply();
}

const stash: Stash = {
  getItem: async <T>(key: string) => stashed.get(key) as T | undefined,
  setItem: (key, value) => stashWrite(() => stashed.set(key, value)),
  removeItem: (key) => stashWrite(() => stashed.delete(key)),
  clear: () => stashWrite(() => stashed.clear()),
};

async function install(): Promise<void> {
  const storage = await import('../storage');
  storage.initStorage({ platform: 'mobile', adapter });
  storage.initStashWithCustom(stash);
}

export async function startCrashStorage(): Promise<CrashStorage> {
  stored = new Map();
  stashed = new Map();
  writes = [];
  failWrite = null;
  failStashRemaining = 0;
  readFaults = new Map();
  await install();

  return {
    failAt: (n, { applied = false } = {}) => {
      failWrite = { remaining: n, applied };
    },
    failStashAt: (n) => {
      failStashRemaining = n;
    },
    failRead: (key) => readFaults.set(key, 'fail'),
    dropRead: (key) => readFaults.set(key, 'drop'),
    garbleRead: (key) => readFaults.set(key, 'garble'),
    snapshot,
    get writes() {
      return writes;
    },
    relaunch: async ({ keepStash = false } = {}) => {
      vi.resetModules();
      if (!keepStash) stashed = new Map();
      await install();
    },
  };
}

/**
 * A see-through cipher for `vi.mock('../crypto/encryption', …)`: the vault
 * shows its secrets, but opens only with the key it was sealed under, as the
 * real one does. The real cipher cannot run under jsdom (tweetnacl refuses its
 * typed arrays), and real PBKDF2 makes every seal slow.
 *
 * It takes the real module rather than importing it, because the mock factory
 * that calls it is that module's own: an import from here would wait on it.
 */
export function keySensitiveCipher(actual: typeof Encryption): typeof Encryption {
  const random = () => Math.random().toString(36).slice(2);
  const keyFor = (password: string, salt: string) =>
    Array.from(new TextEncoder().encode(`${salt}:${password}`));

  const seal = (
    data: unknown,
    key: number[],
    salt: string,
    iterations: number,
    digest: DigestAlgorithm
  ): LockedVault => ({
    encrypted: JSON.stringify({ key, data }),
    nonce: random(),
    salt,
    iterations,
    digest,
    kdf: 'pbkdf2',
  });

  const open = <T>(vault: LockedVault, key: number[]): T => {
    const sealed = JSON.parse(vault.encrypted) as { key: number[]; data: T };
    if (sealed.key.join() !== key.join()) throw new actual.IncorrectPasswordError();
    return sealed.data;
  };

  const keyCacheFor = (key: number[], vault: LockedVault): DerivedKeyCache => ({
    key,
    salt: vault.salt,
    iterations: vault.iterations,
    digest: vault.digest,
    expiresAt: Date.now() + actual.KEY_CACHE_TTL,
  });

  async function lockAndGetKey<T>(
    unlocked: T,
    password: string,
    { iterations = actual.DEFAULT_ITERATIONS, digest = actual.DEFAULT_DIGEST }: LockOptions = {}
  ) {
    const salt = random();
    const key = keyFor(password, salt);
    const vault = seal(unlocked, key, salt, iterations, digest);
    return { vault, keyCache: keyCacheFor(key, vault) };
  }

  async function unlockAndGetKey<T>(locked: LockedVault, password: string) {
    const key = keyFor(password, locked.salt);
    return { data: open<T>(locked, key), keyCache: keyCacheFor(key, locked) };
  }

  return {
    ...actual,
    lockAndGetKey,
    unlockAndGetKey,
    lock: async (unlocked, password, options) =>
      (await lockAndGetKey(unlocked, password, options)).vault,
    unlock: async <T>(locked: LockedVault, password: string) =>
      (await unlockAndGetKey<T>(locked, password)).data,
    lockWithKey: (unlocked, keyCache) =>
      seal(unlocked, keyCache.key, keyCache.salt, keyCache.iterations, keyCache.digest),
    unlockWithKey: <T>(locked: LockedVault, keyCache: DerivedKeyCache) =>
      open<T>(locked, keyCache.key),
  };
}
