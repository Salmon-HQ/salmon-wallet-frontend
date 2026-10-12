import { sessionArea } from './storageCompat';

const SESSION_KEY_STORAGE_KEY = 'salmon_session_key';

/**
 * Remove the derived vault key a v0.17.0 build wrote here on every unlock.
 * Nothing writes it now — the background stash holds the key in memory — but
 * a record written before an in-session update stays until the browser
 * closes, so every lock still sweeps it.
 */
export async function clearSessionKey(): Promise<void> {
  try {
    await sessionArea.remove(SESSION_KEY_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear session key:', error);
  }
}
