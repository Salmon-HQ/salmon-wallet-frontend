/**
 * In-memory session storage (stash) for sensitive data.
 *
 * The stash provides temporary storage for sensitive data like passwords
 * and session tokens that should NOT be persisted to disk. Data is stored
 * only in memory and is lost when the app/extension is closed.
 *
 * On mobile: Uses a simple in-memory Map.
 * On extension: Communicates with the background service worker which
 *               maintains the in-memory state across popup reopens.
 *
 * @module storage/stash
 */

import type { Stash, Platform } from './types';
import { STASH_KEYS } from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Message channel for extension stash communication.
 */
const EXTENSION_STASH_CHANNEL = 'salmon_extension_stash_channel';

/**
 * Stash operation methods for extension messaging.
 */
type StashMethod = 'get' | 'set' | 'delete' | 'clear';

/**
 * Message format for extension stash operations.
 */
interface StashMessage {
  channel: string;
  data: {
    method: StashMethod;
    key?: string;
    value?: unknown;
  };
}

// ============================================================================
// In-Memory Stash Implementation
// ============================================================================

/**
 * Creates an in-memory stash using a Map.
 *
 * This implementation is suitable for mobile apps and web apps where
 * the JavaScript runtime persists for the session duration.
 *
 * @returns A Stash instance using in-memory storage
 */
export function createMemoryStash(): Stash {
  const stashedValues = new Map<string, unknown>();

  return {
    async getItem<T>(key: string): Promise<T | undefined> {
      return stashedValues.get(key) as T | undefined;
    },

    async setItem<T>(key: string, value: T): Promise<void> {
      stashedValues.set(key, value);
    },

    async removeItem(key: string): Promise<void> {
      stashedValues.delete(key);
    },

    async clear(): Promise<void> {
      stashedValues.clear();
    },
  };
}

// ============================================================================
// Extension Stash Implementation
// ============================================================================

/**
 * Chrome runtime API type for message sending.
 */
interface ChromeRuntimeAPI {
  sendMessage<T>(message: unknown, callback?: (response: T) => void): void;
}

/**
 * Gets the chrome runtime API from the global scope.
 */
function getChromeRuntimeAPI(): ChromeRuntimeAPI {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = globalThis as any;
  if (!global.chrome?.runtime?.sendMessage) {
    throw new Error('Chrome runtime API is not available');
  }
  return global.chrome.runtime as ChromeRuntimeAPI;
}

/**
 * Creates a stash that communicates with the extension background service worker.
 *
 * In browser extensions, the popup window can be closed and reopened, losing
 * its JavaScript state. The stash communicates with the background service
 * worker which maintains the in-memory state across popup lifecycle.
 *
 * This requires a message handler in the background script:
 *
 * @example
 * ```typescript
 * // In background.ts service worker
 * const stashValues = new Map<string, unknown>();
 *
 * chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
 *   if (message.channel === 'salmon_extension_stash_channel') {
 *     const { method, key, value } = message.data;
 *     switch (method) {
 *       case 'get':
 *         sendResponse(stashValues.get(key));
 *         break;
 *       case 'set':
 *         stashValues.set(key, value);
 *         sendResponse(undefined);
 *         break;
 *       case 'delete':
 *         stashValues.delete(key);
 *         sendResponse(undefined);
 *         break;
 *       case 'clear':
 *         stashValues.clear();
 *         sendResponse(undefined);
 *         break;
 *     }
 *   }
 *   return true; // Keep channel open for async response
 * });
 * ```
 *
 * @returns A Stash instance that communicates with the background worker
 */
export function createExtensionStash(): Stash {
  const chromeRuntime = getChromeRuntimeAPI();

  /**
   * Sends a message to the background service worker.
   */
  const sendMessage = <T>(message: StashMessage): Promise<T> => {
    return new Promise((resolve, reject) => {
      try {
        chromeRuntime.sendMessage<T>(message, (response: T) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lastError = (globalThis as any).chrome?.runtime?.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }
          resolve(response);
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  return {
    async getItem<T>(key: string): Promise<T | undefined> {
      return sendMessage<T | undefined>({
        channel: EXTENSION_STASH_CHANNEL,
        data: { method: 'get', key },
      });
    },

    async setItem<T>(key: string, value: T): Promise<void> {
      await sendMessage<void>({
        channel: EXTENSION_STASH_CHANNEL,
        data: { method: 'set', key, value },
      });
    },

    async removeItem(key: string): Promise<void> {
      await sendMessage<void>({
        channel: EXTENSION_STASH_CHANNEL,
        data: { method: 'delete', key },
      });
    },

    async clear(): Promise<void> {
      await sendMessage<void>({
        channel: EXTENSION_STASH_CHANNEL,
        data: { method: 'clear' },
      });
    },
  };
}

// ============================================================================
// Background Service Worker Handler
// ============================================================================

/**
 * Creates a message handler for the extension background service worker.
 *
 * Call this function in your background.ts to set up the stash message handler.
 * The handler maintains an in-memory Map that persists across popup reopens.
 *
 * @returns An object with the handler function and a reference to the stash map
 *
 * @example
 * ```typescript
 * // background.ts
 * import { createStashHandler } from '@salmon/shared/storage';
 *
 * const { handler, stashMap } = createStashHandler();
 *
 * chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
 *   if (handler(message, sendResponse)) {
 *     return true; // Keep channel open for async response
 *   }
 *   // Handle other messages...
 * });
 * ```
 */
export function createStashHandler(): {
  handler: (message: StashMessage, sendResponse: (response: unknown) => void) => boolean;
  stashMap: Map<string, unknown>;
} {
  const stashMap = new Map<string, unknown>();

  const handler = (message: StashMessage, sendResponse: (response: unknown) => void): boolean => {
    if (message.channel !== EXTENSION_STASH_CHANNEL) {
      return false;
    }

    const { method, key, value } = message.data;

    switch (method) {
      case 'get':
        sendResponse(key ? stashMap.get(key) : undefined);
        break;
      case 'set':
        if (key !== undefined) {
          stashMap.set(key, value);
        }
        sendResponse(undefined);
        break;
      case 'delete':
        if (key !== undefined) {
          stashMap.delete(key);
        }
        sendResponse(undefined);
        break;
      case 'clear':
        stashMap.clear();
        sendResponse(undefined);
        break;
      default:
        sendResponse(undefined);
    }

    return true;
  };

  return { handler, stashMap };
}

// ============================================================================
// Global Stash Instance
// ============================================================================

/**
 * The current stash instance.
 * Must be initialized before use via initStash().
 */
let currentStash: Stash | null = null;

/**
 * Initializes the global stash instance.
 *
 * This must be called once at app startup before any stash operations.
 * The platform determines which implementation to use.
 *
 * @param platform - The platform to use ('mobile' or 'extension')
 *
 * @example
 * ```typescript
 * // Mobile app
 * initStash('mobile');
 *
 * // Browser extension popup
 * initStash('extension');
 * ```
 */
export function initStash(platform: Platform): void {
  switch (platform) {
    case 'mobile':
      currentStash = createMemoryStash();
      break;
    case 'extension':
      currentStash = createExtensionStash();
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Initializes the stash with a custom implementation.
 *
 * This is useful for testing or when you need custom stash behavior.
 *
 * @param stash - The custom Stash implementation
 */
export function initStashWithCustom(stash: Stash): void {
  currentStash = stash;
}

/**
 * Error thrown when stash is not initialized.
 */
export class StashNotInitializedError extends Error {
  constructor() {
    super('Stash has not been initialized. Call initStash() first.');
    this.name = 'StashNotInitializedError';
    Object.setPrototypeOf(this, StashNotInitializedError.prototype);
  }
}

/**
 * Gets the current stash instance.
 *
 * @returns The initialized Stash instance
 * @throws {StashNotInitializedError} If stash hasn't been initialized
 *
 * @example
 * ```typescript
 * const stash = getStash();
 * const cachedKey = await stash.getItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
 * ```
 */
export function getStash(): Stash {
  if (!currentStash) {
    throw new StashNotInitializedError();
  }
  return currentStash;
}

/**
 * Checks if stash has been initialized.
 *
 * @returns True if stash is ready to use
 */
export function isStashInitialized(): boolean {
  return currentStash !== null;
}

/**
 * Resets the stash instance.
 *
 * This is primarily useful for testing. In production, stash
 * should be initialized once and never reset.
 */
export function resetStash(): void {
  currentStash = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Convenience function to get a typed item from the stash.
 *
 * @typeParam T - The expected type of the stashed value
 * @param key - The stash key
 * @returns The stashed value, or undefined if not found
 * @throws {StashNotInitializedError} If stash hasn't been initialized
 *
 * @example
 * ```typescript
 * const cachedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
 * ```
 */
export async function getStashItem<T>(key: string): Promise<T | undefined> {
  return getStash().getItem<T>(key);
}

/**
 * Convenience function to set a typed item in the stash.
 *
 * @typeParam T - The type of value to store
 * @param key - The stash key
 * @param value - The value to store
 * @throws {StashNotInitializedError} If stash hasn't been initialized
 *
 * @example
 * ```typescript
 * await setStashItem(STASH_KEYS.DERIVED_KEY, derivedKeyCache);
 * ```
 */
export async function setStashItem<T>(key: string, value: T): Promise<void> {
  return getStash().setItem<T>(key, value);
}

/**
 * Convenience function to remove an item from the stash.
 *
 * @param key - The stash key to remove
 * @throws {StashNotInitializedError} If stash hasn't been initialized
 */
export async function removeStashItem(key: string): Promise<void> {
  return getStash().removeItem(key);
}

/**
 * Convenience function to clear all stashed data.
 *
 * This is typically called on logout or lock to clear sensitive session data.
 *
 * @throws {StashNotInitializedError} If stash hasn't been initialized
 *
 * @example
 * ```typescript
 * // On user logout
 * await clearStash();
 * ```
 */
export async function clearStash(): Promise<void> {
  return getStash().clear();
}

// ============================================================================
// Session Management Helpers
// ============================================================================

/**
 * Updates the last activity timestamp.
 *
 * This is used for auto-lock functionality based on inactivity.
 */
export async function updateLastActivity(): Promise<void> {
  await setStashItem(STASH_KEYS.LAST_ACTIVITY, Date.now());
}

/**
 * Gets the last activity timestamp.
 *
 * @returns The timestamp of last activity, or undefined if not set
 */
export async function getLastActivity(): Promise<number | undefined> {
  return getStashItem<number>(STASH_KEYS.LAST_ACTIVITY);
}

/**
 * Checks if the session has timed out based on inactivity.
 *
 * @param timeoutMs - The timeout duration in milliseconds
 * @returns True if the session should be locked
 */
export async function isSessionTimedOut(timeoutMs: number): Promise<boolean> {
  const lastActivity = await getLastActivity();
  if (lastActivity === undefined) {
    return true; // No activity recorded, consider timed out
  }
  return Date.now() - lastActivity > timeoutMs;
}
