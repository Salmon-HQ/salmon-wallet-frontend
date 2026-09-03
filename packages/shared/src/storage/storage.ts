/**
 * Platform-agnostic storage implementation.
 *
 * This module provides a unified storage interface that works across different
 * platforms (mobile, extension, web) by accepting platform-specific adapters.
 *
 * @module storage/storage
 */

import type { StorageAdapter, TypedStorage, Platform, StorageConfig } from './types';

// ============================================================================
// Errors
// ============================================================================

/**
 * Error thrown when storage operations fail.
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * Error thrown when storage is not initialized.
 */
export class StorageNotInitializedError extends Error {
  constructor() {
    super('Storage has not been initialized. Call initStorage() first.');
    this.name = 'StorageNotInitializedError';
    Object.setPrototypeOf(this, StorageNotInitializedError.prototype);
  }
}

// ============================================================================
// Platform-Specific Adapter Factories
// ============================================================================

/**
 * Creates a localStorage adapter for web environments.
 *
 * @returns A StorageAdapter using window.localStorage
 */
export function createLocalStorageAdapter(): StorageAdapter {
  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        throw new StorageError(`Failed to get item "${key}" from localStorage`, error);
      }
    },

    setItem: async (key: string, value: string): Promise<void> => {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        throw new StorageError(`Failed to set item "${key}" in localStorage`, error);
      }
    },

    removeItem: async (key: string): Promise<void> => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        throw new StorageError(`Failed to remove item "${key}" from localStorage`, error);
      }
    },

    clear: async (): Promise<void> => {
      try {
        window.localStorage.clear();
      } catch (error) {
        throw new StorageError('Failed to clear localStorage', error);
      }
    },
  };
}

/**
 * Chrome extension API types (minimal subset needed for storage).
 */
interface ChromeStorageArea {
  get(key: string, callback: (result: Record<string, string | undefined>) => void): void;
  set(items: Record<string, string>, callback: () => void): void;
  remove(key: string, callback: () => void): void;
  clear(callback: () => void): void;
}

interface ChromeRuntime {
  lastError: Error | undefined;
  sendMessage<T>(message: unknown, callback?: (response: T) => void): void;
}

interface ChromeAPI {
  storage: {
    local: ChromeStorageArea;
  };
  runtime: ChromeRuntime;
}

/**
 * Gets the chrome API from the global scope.
 * This is available in browser extension contexts.
 */
function getChromeAPI(): ChromeAPI {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = globalThis as any;
  if (!global.chrome?.storage?.local) {
    throw new StorageError('Chrome storage API is not available');
  }
  return global.chrome as ChromeAPI;
}

/**
 * Creates a chrome.storage.local adapter for browser extensions.
 *
 * This adapter is designed to work with Manifest V3 extensions.
 * The chrome global must be available (will be injected by the extension runtime).
 *
 * @returns A StorageAdapter using chrome.storage.local
 */
export function createChromeStorageAdapter(): StorageAdapter {
  return {
    getItem: async (key: string): Promise<string | null> => {
      const chrome = getChromeAPI();
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, (result: Record<string, string | undefined>) => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new StorageError(`Failed to get item "${key}" from chrome.storage`, error));
          } else {
            // The value is already a string (we store it as JSON string)
            resolve(result[key] ?? null);
          }
        });
      });
    },

    setItem: async (key: string, value: string): Promise<void> => {
      const chrome = getChromeAPI();
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new StorageError(`Failed to set item "${key}" in chrome.storage`, error));
          } else {
            resolve();
          }
        });
      });
    },

    removeItem: async (key: string): Promise<void> => {
      const chrome = getChromeAPI();
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, () => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new StorageError(`Failed to remove item "${key}" from chrome.storage`, error));
          } else {
            resolve();
          }
        });
      });
    },

    clear: async (): Promise<void> => {
      const chrome = getChromeAPI();
      return new Promise((resolve, reject) => {
        chrome.storage.local.clear(() => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new StorageError('Failed to clear chrome.storage', error));
          } else {
            resolve();
          }
        });
      });
    },
  };
}

/**
 * Creates an expo-secure-store adapter for React Native/Expo mobile apps.
 *
 * This is a factory that accepts the SecureStore module as a parameter,
 * allowing the mobile app to inject the actual implementation.
 *
 * Note: expo-secure-store has size limits (2048 bytes on iOS). For larger
 * data, consider using AsyncStorage with encryption.
 *
 * @param SecureStore - The expo-secure-store module
 * @returns A StorageAdapter using SecureStore
 *
 * @example
 * ```typescript
 * import * as SecureStore from 'expo-secure-store';
 *
 * const adapter = createSecureStoreAdapter(SecureStore);
 * initStorage({ platform: 'mobile', adapter });
 * ```
 */
export function createSecureStoreAdapter(SecureStore: {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}): StorageAdapter {
  // Track keys for clear functionality (SecureStore doesn't have clear)
  const knownKeys = new Set<string>();

  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        throw new StorageError(`Failed to get item "${key}" from SecureStore`, error);
      }
    },

    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await SecureStore.setItemAsync(key, value);
        knownKeys.add(key);
      } catch (error) {
        throw new StorageError(`Failed to set item "${key}" in SecureStore`, error);
      }
    },

    removeItem: async (key: string): Promise<void> => {
      try {
        await SecureStore.deleteItemAsync(key);
        knownKeys.delete(key);
      } catch (error) {
        throw new StorageError(`Failed to remove item "${key}" from SecureStore`, error);
      }
    },

    clear: async (): Promise<void> => {
      // SecureStore doesn't have a clear method, so we delete known keys
      const errors: Error[] = [];
      for (const key of knownKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          errors.push(error as Error);
        }
      }
      knownKeys.clear();

      if (errors.length > 0) {
        throw new StorageError(
          `Failed to clear some SecureStore items: ${errors.map((e) => e.message).join(', ')}`
        );
      }
    },
  };
}

/**
 * Creates an AsyncStorage adapter for React Native.
 *
 * AsyncStorage is suitable for larger data that doesn't fit in SecureStore.
 * For sensitive data, combine with encryption from the crypto module.
 *
 * @param AsyncStorage - The @react-native-async-storage/async-storage module
 * @returns A StorageAdapter using AsyncStorage
 *
 * @example
 * ```typescript
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 *
 * const adapter = createAsyncStorageAdapter(AsyncStorage);
 * initStorage({ platform: 'mobile', adapter });
 * ```
 */
export function createAsyncStorageAdapter(AsyncStorage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}): StorageAdapter {
  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return await AsyncStorage.getItem(key);
      } catch (error) {
        throw new StorageError(`Failed to get item "${key}" from AsyncStorage`, error);
      }
    },

    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (error) {
        throw new StorageError(`Failed to set item "${key}" in AsyncStorage`, error);
      }
    },

    removeItem: async (key: string): Promise<void> => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        throw new StorageError(`Failed to remove item "${key}" from AsyncStorage`, error);
      }
    },

    clear: async (): Promise<void> => {
      try {
        await AsyncStorage.clear();
      } catch (error) {
        throw new StorageError('Failed to clear AsyncStorage', error);
      }
    },
  };
}

// ============================================================================
// Storage Implementation
// ============================================================================

/**
 * Creates a typed storage instance from a raw adapter.
 *
 * This wraps a StorageAdapter and provides type-safe operations
 * with automatic JSON serialization/deserialization.
 *
 * @param adapter - The platform-specific storage adapter
 * @returns A TypedStorage instance
 */
export function createTypedStorage(adapter: StorageAdapter): TypedStorage {
  return {
    async getItem<T>(key: string): Promise<T | null> {
      const raw = await adapter.getItem(key);
      if (raw === null) {
        return null;
      }
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as T;
      }
    },

    async setItem<T>(key: string, value: T): Promise<void> {
      try {
        const serialized = JSON.stringify(value);
        await adapter.setItem(key, serialized);
      } catch (error) {
        throw new StorageError(`Failed to serialize value for key "${key}"`, error);
      }
    },

    async removeItem(key: string): Promise<void> {
      await adapter.removeItem(key);
    },

    async clear(): Promise<void> {
      await adapter.clear();
    },
  };
}

// ============================================================================
// Global Storage Instance
// ============================================================================

/**
 * The current storage adapter instance.
 * Must be initialized before use via initStorage().
 */
let currentAdapter: StorageAdapter | null = null;

/**
 * The current typed storage instance.
 * Created when initStorage() is called.
 */
let currentStorage: TypedStorage | null = null;

/**
 * The current platform.
 */
let currentPlatform: Platform | null = null;

/**
 * Initializes the global storage instance.
 *
 * This must be called once at app startup before any storage operations.
 * The platform parameter determines which adapter to use, unless a custom
 * adapter is provided.
 *
 * @param config - Storage configuration
 * @throws {Error} If an unsupported platform is specified without a custom adapter
 *
 * @example
 * ```typescript
 * // Mobile app initialization
 * import * as SecureStore from 'expo-secure-store';
 *
 * initStorage({
 *   platform: 'mobile',
 *   adapter: createSecureStoreAdapter(SecureStore),
 * });
 *
 * // Extension initialization
 * initStorage({ platform: 'extension' });
 * ```
 */
export function initStorage(config: StorageConfig): void {
  const { platform, adapter } = config;

  // Use custom adapter if provided
  if (adapter) {
    currentAdapter = adapter;
    currentStorage = createTypedStorage(adapter);
    currentPlatform = platform;
    return;
  }

  // Create platform-specific adapter
  switch (platform) {
    case 'extension':
      currentAdapter = createChromeStorageAdapter();
      break;
    case 'mobile':
      // Mobile requires explicit adapter injection
      throw new Error(
        'Mobile platform requires an explicit adapter. ' +
          'Use createSecureStoreAdapter() or createAsyncStorageAdapter() and pass it in the config.'
      );
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  currentStorage = createTypedStorage(currentAdapter);
  currentPlatform = platform;
}

/**
 * Gets the current storage instance.
 *
 * @returns The initialized TypedStorage instance
 * @throws {StorageNotInitializedError} If storage hasn't been initialized
 *
 * @example
 * ```typescript
 * const storage = getStorage();
 * const settings = await storage.getItem<Settings>('settings');
 * ```
 */
export function getStorage(): TypedStorage {
  if (!currentStorage) {
    throw new StorageNotInitializedError();
  }
  return currentStorage;
}

/**
 * Gets the current storage adapter.
 *
 * This is useful when you need direct access to the raw adapter
 * (e.g., for testing or advanced use cases).
 *
 * @returns The initialized StorageAdapter instance
 * @throws {StorageNotInitializedError} If storage hasn't been initialized
 */
export function getStorageAdapter(): StorageAdapter {
  if (!currentAdapter) {
    throw new StorageNotInitializedError();
  }
  return currentAdapter;
}

/**
 * Gets the current platform.
 *
 * @returns The current platform, or null if not initialized
 */
export function getCurrentPlatform(): Platform | null {
  return currentPlatform;
}

/**
 * Checks if storage has been initialized.
 *
 * @returns True if storage is ready to use
 */
export function isStorageInitialized(): boolean {
  return currentStorage !== null;
}

/**
 * Resets the storage instance.
 *
 * This is primarily useful for testing. In production, storage
 * should be initialized once and never reset.
 */
export function resetStorage(): void {
  currentAdapter = null;
  currentStorage = null;
  currentPlatform = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Convenience function to get a typed item from storage.
 *
 * @typeParam T - The expected type of the stored value
 * @param key - The storage key
 * @returns The deserialized value, or null if not found
 * @throws {StorageNotInitializedError} If storage hasn't been initialized
 *
 * @example
 * ```typescript
 * interface Vault {
 *   encrypted: string;
 *   nonce: string;
 * }
 *
 * const vault = await getStorageItem<Vault>(STORAGE_KEYS.VAULT);
 * ```
 */
export async function getStorageItem<T>(key: string): Promise<T | null> {
  return getStorage().getItem<T>(key);
}

/**
 * Convenience function to set a typed item in storage.
 *
 * @typeParam T - The type of value to store
 * @param key - The storage key
 * @param value - The value to store
 * @throws {StorageNotInitializedError} If storage hasn't been initialized
 *
 * @example
 * ```typescript
 * await setStorageItem(STORAGE_KEYS.SETTINGS, { theme: 'dark' });
 * ```
 */
export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  return getStorage().setItem<T>(key, value);
}

/**
 * Convenience function to remove an item from storage.
 *
 * @param key - The storage key to remove
 * @throws {StorageNotInitializedError} If storage hasn't been initialized
 */
export async function removeStorageItem(key: string): Promise<void> {
  return getStorage().removeItem(key);
}

/**
 * Convenience function to clear all storage.
 *
 * Use with caution - this will delete all stored data!
 *
 * @throws {StorageNotInitializedError} If storage hasn't been initialized
 */
export async function clearStorage(): Promise<void> {
  return getStorage().clear();
}
