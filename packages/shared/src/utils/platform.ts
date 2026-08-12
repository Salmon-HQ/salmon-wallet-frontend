/**
 * Platform detection utilities.
 *
 * Consolidated from useRuntime.ts and useInactivityTimeout.ts.
 * Uses globalThis casting to avoid type conflicts with WXT's auto-generated types.
 *
 * @module utils/platform
 */

/**
 * Detects if running in a React Native environment.
 */
export function isReactNative(): boolean {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

/**
 * Detects if running in a web browser environment (not React Native).
 */
export function isWebEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && !isReactNative();
}

/**
 * Checks if the current environment is a browser extension.
 * Uses dynamic property access to avoid type conflicts with WXT's browser global type declarations.
 */
export function isExtension(): boolean {
  if (typeof window === 'undefined') return false;

  const globalObj = globalThis as Record<string, unknown>;

  // Check for Chrome extension APIs
  const chromeObj = globalObj['chrome'] as { runtime?: { id?: string } } | undefined;
  if (chromeObj?.runtime?.id) {
    return true;
  }

  // Check for browser extension APIs (Firefox, etc.)
  const browserObj = globalObj['browser'] as { runtime?: { id?: string } } | undefined;
  if (browserObj?.runtime?.id) {
    return true;
  }

  return false;
}
