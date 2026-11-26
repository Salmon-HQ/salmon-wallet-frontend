import { afterEach, describe, expect, it, vi } from 'vitest';
import * as encryption from '../crypto/encryption';
import {
  getStashItem,
  getStorageItem,
  removeStorageItem,
  setStashItem,
  setStorageItem,
  STASH_KEYS,
} from '../storage';
import { keySensitiveCipher, startCrashStorage } from './crash-storage';

const { DERIVED_KEY } = STASH_KEYS;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('startCrashStorage', () => {
  it('fails the n-th write without landing it', async () => {
    const crash = await startCrashStorage();
    crash.failAt(2);

    await setStorageItem('a', 1);
    const before = crash.snapshot();
    await expect(setStorageItem('b', 2)).rejects.toThrow();

    expect(crash.snapshot()).toEqual(before);
    expect(before).toEqual({ a: 1 });
  });

  it('lands the n-th write, then throws, when it is applied', async () => {
    const crash = await startCrashStorage();
    await setStorageItem('a', 1);
    crash.failAt(1, { applied: true });

    await expect(removeStorageItem('a')).rejects.toThrow();

    expect(crash.snapshot()).toEqual({});
  });

  it('fails only the n-th write it counts from when armed', async () => {
    const crash = await startCrashStorage();
    await setStorageItem('a', 1);
    crash.failAt(1);

    await expect(setStorageItem('b', 2)).rejects.toThrow();
    await setStorageItem('c', 3);

    expect(crash.snapshot()).toEqual({ a: 1, c: 3 });
  });

  it('fails the n-th stash write without landing it', async () => {
    const crash = await startCrashStorage();
    crash.failStashAt(2);

    await setStashItem('x', 1);
    await expect(setStashItem(DERIVED_KEY, { key: [1] })).rejects.toThrow();

    expect(await getStashItem('x')).toBe(1);
    expect(await getStashItem(DERIVED_KEY)).toBeUndefined();
  });

  it('throws on a read of a failed key and leaves other keys readable', async () => {
    const crash = await startCrashStorage();
    await setStorageItem('a', [1]);
    await setStorageItem('b', [2]);
    crash.failRead('a');

    await expect(getStorageItem('a')).rejects.toThrow();
    expect(await getStorageItem('b')).toEqual([2]);
  });

  it('reads a dropped key as absent while it is still stored', async () => {
    const crash = await startCrashStorage();
    await setStorageItem('a', [1]);
    crash.dropRead('a');

    expect(await getStorageItem('a')).toBeNull();
    expect(crash.snapshot()).toEqual({ a: [1] });
  });

  it('reads a garbled key as the raw string storage could not parse', async () => {
    const crash = await startCrashStorage();
    await setStorageItem('a', { W: 'secret' });
    crash.garbleRead('a');

    const read = await getStorageItem<unknown>('a');

    expect(typeof read).toBe('string');
    expect(() => JSON.parse(read as string)).toThrow();
    expect(crash.snapshot()).toEqual({ a: { W: 'secret' } });
  });

  it('faults only the n-th read of a key counted from arming, once', async () => {
    const crash = await startCrashStorage();
    await setStorageItem('a', [1]);
    await setStorageItem('b', [2]);
    crash.failRead('a', { at: 2 });
    crash.dropRead('b', { at: 1 });

    expect(await getStorageItem('a')).toEqual([1]);
    await expect(getStorageItem('a')).rejects.toThrow();
    expect(await getStorageItem('a')).toEqual([1]);
    expect(await getStorageItem('b')).toBeNull();
    expect(await getStorageItem('b')).toEqual([2]);

    crash.garbleRead('a', { at: 1 });
    expect(typeof (await getStorageItem<unknown>('a'))).toBe('string');
    expect(await getStorageItem('a')).toEqual([1]);
  });

  it('keeps a read fault without `at` on every read until the next start', async () => {
    const crash = await startCrashStorage();
    await setStorageItem('a', [1]);
    crash.dropRead('a');

    expect(await getStorageItem('a')).toBeNull();
    expect(await getStorageItem('a')).toBeNull();

    await startCrashStorage();
    await setStorageItem('a', [1]);
    expect(await getStorageItem('a')).toEqual([1]);
  });

  it('lands the next n writes after a kill, fails every later one, until a relaunch', async () => {
    const crash = await startCrashStorage();
    await setStorageItem('a', 1);
    const start = crash.writes.length;
    crash.killAfter(2);

    await setStorageItem('b', 2);
    await removeStorageItem('a');
    await expect(setStorageItem('c', 3)).rejects.toThrow();
    await expect(removeStorageItem('b')).rejects.toThrow();
    await expect(setStashItem(DERIVED_KEY, { key: [1] })).rejects.toThrow();
    expect(crash.writes).toHaveLength(start + 2);
    expect(await getStashItem(DERIVED_KEY)).toBeUndefined();

    await crash.relaunch({ keepStash: true });
    const storage = await import('../storage');

    expect(crash.snapshot()).toEqual(crash.writes[start + 1].after);
    expect(crash.snapshot()).toEqual({ b: 2 });
    expect(await storage.getStashItem(DERIVED_KEY)).toBeUndefined();
    await storage.setStorageItem('d', 4);
    await storage.setStashItem(DERIVED_KEY, { key: [2] });
    expect(crash.snapshot()).toEqual({ b: 2, d: 4 });
  });

  it('records a snapshot after each landed write', async () => {
    const crash = await startCrashStorage();
    crash.failAt(2);

    await setStorageItem('a', 1);
    await expect(setStorageItem('b', 2)).rejects.toThrow();
    await setStorageItem('b', 3);
    await removeStorageItem('a');

    expect(crash.writes).toEqual([
      { key: 'a', after: { a: 1 } },
      { key: 'b', after: { a: 1, b: 3 } },
      { key: 'a', after: { b: 3 } },
    ]);
  });

  it('keeps storage across a relaunch', async () => {
    const crash = await startCrashStorage();
    await setStorageItem('a', 1);

    await crash.relaunch();
    const storage = await import('../storage');

    expect(await storage.getStorageItem('a')).toBe(1);
  });

  it('starts a relaunched runtime with no own-write mark and an empty write queue', async () => {
    vi.stubGlobal('navigator', {});
    const crash = await startCrashStorage();
    const before = await import('../hooks/useAccountsMutationHelpers');
    await before.writeStoredAccounts([{ id: 'A', name: 'A', avatar: 'default', pathIndexes: {} }], {
      own: true,
    });
    void before.withVaultWriteLock(() => new Promise<never>(() => undefined));

    await crash.relaunch();
    const after = await import('../hooks/useAccountsMutationHelpers');

    expect(after).not.toBe(before);
    expect(after.isOwnStoredAccountsWrite(['A'])).toBe(false);
    await expect(after.withVaultWriteLock(async () => 'ran')).resolves.toBe('ran');
  });

  it('keeps the cached key across a relaunch only when asked', async () => {
    const crash = await startCrashStorage();
    await setStashItem(DERIVED_KEY, { key: [1] });

    await crash.relaunch({ keepStash: true });
    expect(await (await import('../storage')).getStashItem(DERIVED_KEY)).toEqual({ key: [1] });

    await crash.relaunch();
    expect(await (await import('../storage')).getStashItem(DERIVED_KEY)).toBeUndefined();
  });
});

describe('keySensitiveCipher', () => {
  const cipher = keySensitiveCipher(encryption);

  it('opens a vault only with the key it was sealed under', async () => {
    const { vault, keyCache } = await cipher.lockAndGetKey({ W: 'secret' }, 'P1');
    const other = (await cipher.lockAndGetKey({}, 'P2')).keyCache;

    expect(cipher.unlockWithKey(vault, keyCache)).toEqual({ W: 'secret' });
    expect(cipher.unlockWithKey(cipher.lockWithKey({ X: 'y' }, keyCache), keyCache)).toEqual({
      X: 'y',
    });
    expect(() => cipher.unlockWithKey(vault, other)).toThrow(encryption.IncorrectPasswordError);
    expect(() => cipher.unlockWithKey(vault, { ...keyCache, key: other.key })).toThrow(
      encryption.IncorrectPasswordError
    );
  });

  it('opens a vault only with the password it was sealed under', async () => {
    const vault = await cipher.lock({ W: 'secret' }, 'P1');

    expect((await cipher.unlockAndGetKey(vault, 'P1')).data).toEqual({ W: 'secret' });
    await expect(cipher.unlockAndGetKey(vault, 'P2')).rejects.toThrow(
      encryption.IncorrectPasswordError
    );
    await expect(cipher.unlock(vault, 'P2')).rejects.toThrow(encryption.IncorrectPasswordError);
  });

  it('gives back a key that opens the vault and stays valid for the cache lifetime', async () => {
    const vault = await cipher.lock({ W: 'secret' }, 'P1');

    const { keyCache } = await cipher.unlockAndGetKey(vault, 'P1');

    expect(cipher.unlockWithKey(vault, keyCache)).toEqual({ W: 'secret' });
    expect(cipher.isKeyCacheValid(keyCache)).toBe(true);
  });

  it('seals the same vault differently each time', async () => {
    const { keyCache } = await cipher.lockAndGetKey({}, 'P1');

    expect(cipher.lockWithKey({ W: 'secret' }, keyCache)).not.toEqual(
      cipher.lockWithKey({ W: 'secret' }, keyCache)
    );
  });
});
