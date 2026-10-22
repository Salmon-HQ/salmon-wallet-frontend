/**
 * Anonymous install id + ephemeral session id.
 *
 * The install id is a random UUID persisted locally. It is NOT derived from the
 * seed, address, or any wallet material — it identifies an install, not a
 * person, and is cleared when the user withdraws consent so re-enabling starts
 * a fresh identity.
 */

import { getStorage, STORAGE_KEYS } from '../storage';

/**
 * A random v4 UUID from the platform CSPRNG. Mobile's Hermes has no
 * `randomUUID`; `getRandomValues` is polyfilled there by `index.js`.
 */
function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
