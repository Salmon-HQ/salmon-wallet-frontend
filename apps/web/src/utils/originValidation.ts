/**
 * Origin validation utilities for dApp connection.
 */

/** Check if the given origin uses HTTPS (or localhost for dev). */
export function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

/**
 * Check if the origin is already trusted (auto-connect).
 * Looks up the activeTrustedApps map from wallet state.
 */
export function isTrustedOrigin(
  origin: string,
  trustedApps: Record<string, { name: string; icon?: string }> | null | undefined
): boolean {
  if (!trustedApps) return false;
  try {
    const url = new URL(origin);
    return url.hostname in trustedApps;
  } catch {
    return false;
  }
}
