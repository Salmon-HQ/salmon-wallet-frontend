/**
 * Tests for the platform-agnostic typed storage and its adapters (spec 009, US4)
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  createTypedStorage,
  createLocalStorageAdapter,
  createChromeStorageAdapter,
  createSecureStoreAdapter,
  createAsyncStorageAdapter,
  initStorage,
  getStorage,
  getStorageAdapter,
  getCurrentPlatform,
  isStorageInitialized,
  resetStorage,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  clearStorage,
  StorageError,
  StorageNotInitializedError,
} from './storage';
import type { StorageAdapter, Platform } from './types';

/** Simple Map-backed adapter — the reference implementation for these tests. */
function createMapAdapter(backing = new Map<string, string>()): StorageAdapter {
  return {
    getItem: async (key) => backing.get(key) ?? null,
    setItem: async (key, value) => {
      backing.set(key, value);
    },
    removeItem: async (key) => {
      backing.delete(key);
    },
    clear: async () => {
      backing.clear();
    },
  };
}

describe('storage', () => {
  afterEach(() => {
    resetStorage();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // createTypedStorage — JSON contract
  // ==========================================================================

  describe('createTypedStorage', () => {
    it('round-trips objects through JSON serialization', async () => {
      const backing = new Map<string, string>();
      const storage = createTypedStorage(createMapAdapter(backing));
      const vaultLike = { encrypted: 'abc', nonce: 'def', iterations: 220000 };

      await storage.setItem('vault', vaultLike);

      // Persisted as a JSON string, read back as the original object
      expect(backing.get('vault')).toBe(JSON.stringify(vaultLike));
      expect(await storage.getItem('vault')).toEqual(vaultLike);
    });

    it('returns null for missing keys', async () => {
      const storage = createTypedStorage(createMapAdapter());
      expect(await storage.getItem('missing')).toBeNull();
    });

    it('returns the raw string when stored JSON is corrupt (current fallback contract)', async () => {
      // TODO(spec 009 finding): corrupt JSON is NOT reported as an error —
      // createTypedStorage.getItem catches JSON.parse failures and silently
      // returns the raw string cast to T (storage.ts `catch { return raw as T }`).
      // Callers must validate the shape themselves (e.g. isValidVault does).
      // This test pins today's behavior; if the contract is ever made explicit
      // (throw or null), update this assertion deliberately.
      const backing = new Map<string, string>([['vault', '{corrupt json!!']]);
      const storage = createTypedStorage(createMapAdapter(backing));

      const result = await storage.getItem<{ encrypted: string }>('vault');

      expect(result).toBe('{corrupt json!!');
    });

    it('throws StorageError when the value cannot be serialized', async () => {
      const storage = createTypedStorage(createMapAdapter());
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      await expect(storage.setItem('key', circular)).rejects.toThrow(StorageError);
    });

    it('removeItem and clear delegate to the adapter', async () => {
      const backing = new Map<string, string>();
      const storage = createTypedStorage(createMapAdapter(backing));

      await storage.setItem('a', 1);
      await storage.setItem('b', 2);
      await storage.removeItem('a');
      expect(backing.has('a')).toBe(false);

      await storage.clear();
      expect(backing.size).toBe(0);
    });
  });

  // ==========================================================================
  // Global instance lifecycle
  // ==========================================================================

  describe('init / get lifecycle', () => {
    it('getStorage and getStorageAdapter throw before initStorage', () => {
      expect(isStorageInitialized()).toBe(false);
      expect(() => getStorage()).toThrow(StorageNotInitializedError);
      expect(() => getStorageAdapter()).toThrow(StorageNotInitializedError);
      expect(getCurrentPlatform()).toBeNull();
    });

    it('initStorage with a custom adapter wires storage, adapter, and platform', async () => {
      const adapter = createMapAdapter();
      initStorage({ platform: 'mobile', adapter });

      expect(isStorageInitialized()).toBe(true);
      expect(getStorageAdapter()).toBe(adapter);
      expect(getCurrentPlatform()).toBe('mobile');

      await setStorageItem('k', { a: 1 });
      expect(await getStorageItem('k')).toEqual({ a: 1 });
    });

    it('initStorage("mobile") without an adapter throws', () => {
      expect(() => initStorage({ platform: 'mobile' })).toThrow(
        'Mobile platform requires an explicit adapter'
      );
    });

    it('initStorage throws for an unsupported platform', () => {
      expect(() => initStorage({ platform: 'toaster' as Platform })).toThrow(
        'Unsupported platform'
      );
    });

    it('resetStorage de-initializes everything', () => {
      initStorage({ platform: 'web', adapter: createMapAdapter() });
      resetStorage();
      expect(isStorageInitialized()).toBe(false);
      expect(getCurrentPlatform()).toBeNull();
    });

    it('convenience functions round-trip and clear', async () => {
      initStorage({ platform: 'web', adapter: createMapAdapter() });

      await setStorageItem('a', 'x');
      await setStorageItem('b', 'y');
      await removeStorageItem('a');
      expect(await getStorageItem('a')).toBeNull();

      await clearStorage();
      expect(await getStorageItem('b')).toBeNull();
    });
  });

  // ==========================================================================
  // localStorage adapter (web)
  // ==========================================================================

  describe('createLocalStorageAdapter', () => {
    function stubWindowLocalStorage(impl: Partial<Storage>): void {
      vi.stubGlobal('window', { localStorage: impl });
    }

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('delegates get/set/remove/clear to window.localStorage', async () => {
      const backing = new Map<string, string>();
      stubWindowLocalStorage({
        getItem: (k: string) => backing.get(k) ?? null,
        setItem: (k: string, v: string) => void backing.set(k, v),
        removeItem: (k: string) => void backing.delete(k),
        clear: () => backing.clear(),
      });

      const adapter = createLocalStorageAdapter();

      await adapter.setItem('k', 'v');
      expect(await adapter.getItem('k')).toBe('v');
      await adapter.removeItem('k');
      expect(await adapter.getItem('k')).toBeNull();
      await adapter.setItem('other', 'v');
      await adapter.clear();
      expect(backing.size).toBe(0);
    });

    it('wraps localStorage failures in StorageError', async () => {
      stubWindowLocalStorage({
        getItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      });

      const adapter = createLocalStorageAdapter();

      await expect(adapter.getItem('k')).rejects.toThrow(StorageError);
      await expect(adapter.setItem('k', 'v')).rejects.toThrow(StorageError);
    });
  });

  // ==========================================================================
  // chrome.storage.local adapter (extension)
  // ==========================================================================

  describe('createChromeStorageAdapter', () => {
    function stubChrome(backing = new Map<string, string>(), lastError?: Error) {
      vi.stubGlobal('chrome', {
        runtime: { lastError },
        storage: {
          local: {
            get: (key: string, cb: (result: Record<string, string | undefined>) => void) =>
              cb({ [key]: backing.get(key) }),
            set: (items: Record<string, string>, cb: () => void) => {
              for (const [k, v] of Object.entries(items)) backing.set(k, v);
              cb();
            },
            remove: (key: string, cb: () => void) => {
              backing.delete(key);
              cb();
            },
            clear: (cb: () => void) => {
              backing.clear();
              cb();
            },
          },
        },
      });
      return backing;
    }

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('round-trips values through chrome.storage.local', async () => {
      const backing = stubChrome();
      const adapter = createChromeStorageAdapter();

      await adapter.setItem('vault', 'ciphertext');
      expect(await adapter.getItem('vault')).toBe('ciphertext');
      expect(await adapter.getItem('missing')).toBeNull();

      await adapter.removeItem('vault');
      expect(await adapter.getItem('vault')).toBeNull();

      await adapter.setItem('a', '1');
      await adapter.clear();
      expect(backing.size).toBe(0);
    });

    it('rejects with StorageError when chrome.runtime.lastError is set', async () => {
      stubChrome(new Map(), new Error('quota exceeded'));
      const adapter = createChromeStorageAdapter();

      await expect(adapter.getItem('k')).rejects.toThrow(StorageError);
      await expect(adapter.setItem('k', 'v')).rejects.toThrow(StorageError);
    });

    it('throws StorageError when the chrome API is unavailable', async () => {
      const adapter = createChromeStorageAdapter();
      await expect(adapter.getItem('k')).rejects.toThrow(StorageError);
    });
  });

  // ==========================================================================
  // SecureStore adapter (mobile)
  // ==========================================================================

  describe('createSecureStoreAdapter', () => {
    function createFakeSecureStore(backing = new Map<string, string>()) {
      return {
        backing,
        getItemAsync: vi.fn(async (key: string) => backing.get(key) ?? null),
        setItemAsync: vi.fn(async (key: string, value: string) => {
          backing.set(key, value);
        }),
        deleteItemAsync: vi.fn(async (key: string) => {
          backing.delete(key);
        }),
      };
    }

    it('round-trips values through SecureStore', async () => {
      const fake = createFakeSecureStore();
      const adapter = createSecureStoreAdapter(fake);

      await adapter.setItem('vault', 'ciphertext');
      expect(await adapter.getItem('vault')).toBe('ciphertext');

      await adapter.removeItem('vault');
      expect(await adapter.getItem('vault')).toBeNull();
    });

    it('clear deletes every key that was set through the adapter', async () => {
      const fake = createFakeSecureStore();
      const adapter = createSecureStoreAdapter(fake);

      await adapter.setItem('a', '1');
      await adapter.setItem('b', '2');
      await adapter.clear();

      expect(fake.backing.size).toBe(0);
      expect(fake.deleteItemAsync).toHaveBeenCalledWith('a');
      expect(fake.deleteItemAsync).toHaveBeenCalledWith('b');
    });

    it('wraps SecureStore failures in StorageError', async () => {
      const fake = createFakeSecureStore();
      fake.getItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));
      const adapter = createSecureStoreAdapter(fake);

      await expect(adapter.getItem('vault')).rejects.toThrow(StorageError);
    });
  });

  // ==========================================================================
  // AsyncStorage adapter (mobile, non-secret data)
  // ==========================================================================

  describe('createAsyncStorageAdapter', () => {
    it('delegates and wraps failures in StorageError', async () => {
      const backing = new Map<string, string>();
      const fake = {
        getItem: vi.fn(async (key: string) => backing.get(key) ?? null),
        setItem: vi.fn(async (key: string, value: string) => {
          backing.set(key, value);
        }),
        removeItem: vi.fn(async (key: string) => {
          backing.delete(key);
        }),
        clear: vi.fn(async () => backing.clear()),
      };
      const adapter = createAsyncStorageAdapter(fake);

      await adapter.setItem('k', 'v');
      expect(await adapter.getItem('k')).toBe('v');
      await adapter.removeItem('k');
      await adapter.clear();
      expect(backing.size).toBe(0);

      fake.setItem.mockRejectedValueOnce(new Error('disk full'));
      await expect(adapter.setItem('k', 'v')).rejects.toThrow(StorageError);
    });
  });
});
