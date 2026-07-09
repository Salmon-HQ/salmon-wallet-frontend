/**
 * Anonymous install id + ephemeral session id.
 *
 * The install id is a random UUID persisted locally. It is NOT derived from the
 * seed, address, or any wallet material — it identifies an install, not a
 * person, and is cleared when the user withdraws consent so re-enabling starts
 * a fresh identity.
 */

import { getStorage, STORAGE_KEYS } from '../storage';

/** Generates a random id, preferring the platform CSPRNG. */
function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Returns the stored install id, creating and persisting one if absent. */
export async function getOrCreateInstallId(): Promise<string> {
  const storage = getStorage();
  const existing = await storage.getItem<string>(STORAGE_KEYS.ANALYTICS_INSTALL_ID);
  if (existing) return existing;

  const id = randomId();
  await storage.setItem(STORAGE_KEYS.ANALYTICS_INSTALL_ID, id);
  return id;
}

/** Removes the install id so a future opt-in gets a brand-new identity. */
export async function clearInstallId(): Promise<void> {
  const storage = getStorage();
  await storage.removeItem(STORAGE_KEYS.ANALYTICS_INSTALL_ID);
}

/**
 * Creates a fresh ephemeral session id. Held in memory only, never persisted,
 * rotated whenever the client re-initialises.
 */
export function createSessionId(): string {
  return randomId();
}
