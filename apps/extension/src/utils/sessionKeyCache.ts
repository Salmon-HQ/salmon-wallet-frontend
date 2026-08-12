import { DerivedKeyCache, isKeyCacheValid } from '@salmon/shared';
import { sessionArea } from './storageCompat';

const SESSION_KEY_STORAGE_KEY = 'salmon_session_key';

/**
 * Store the derived key in session storage.
 * This key persists while the browser is open but is cleared when browser closes.
 */
export async function storeSessionKey(keyCache: DerivedKeyCache): Promise<void> {
  try {
    await sessionArea.set({
      [SESSION_KEY_STORAGE_KEY]: keyCache,
    });
  } catch (error) {
    console.warn('Failed to store session key:', error);
  }
}

/**
 * Retrieve the cached session key if valid.
 */
export async function getSessionKey(): Promise<DerivedKeyCache | null> {
  try {
    const result = await sessionArea.get(SESSION_KEY_STORAGE_KEY);
    const keyCache = result[SESSION_KEY_STORAGE_KEY] as DerivedKeyCache | undefined;

    if (keyCache && isKeyCacheValid(keyCache)) {
      return keyCache;
    }
    return null;
  } catch (error) {
    console.warn('Failed to get session key:', error);
    return null;
  }
}

/**
 * Clear the session key (on logout or password change).
 */
export async function clearSessionKey(): Promise<void> {
  try {
    await sessionArea.remove(SESSION_KEY_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear session key:', error);
  }
}

/**
 * Check if a valid session key exists.
 */
export async function hasValidSessionKey(): Promise<boolean> {
  const key = await getSessionKey();
  return key !== null;
}
