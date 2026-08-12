import { useMemo } from 'react';
import type { RuntimeInfo } from './useRuntime';

// Type declarations for browser extension global APIs
// These are only available in extension contexts
declare const chrome: { runtime?: { id?: string } } | undefined;
declare const browser: { runtime?: { id?: string } } | undefined;

/**
 * Checks if the current environment is a browser extension.
 * This is used to determine adapter mode on web platforms.
 */
const isExtension = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check for Chrome extension APIs
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    return true;
  }

  // Check for browser extension APIs (Firefox, etc.)
  if (typeof browser !== 'undefined' && (browser as typeof chrome)?.runtime?.id) {
    return true;
  }

  return false;
};

/**
 * Runtime hook for web and browser extension environments.
 *
 * This hook provides runtime context information for detecting
 * adapter mode and connection parameters in web-based environments.
 *
 * @returns RuntimeInfo object with context and adapter detection
 *
 * @example
 * ```tsx
 * import { useRuntime } from '@salmon/shared/hooks';
 *
 * function MyComponent() {
 *   const { ready, isAdapter, context } = useRuntime();
 *
 *   if (isAdapter) {
 *     const origin = context.get('origin');
 *     // Handle adapter connection
 *   }
 * }
 * ```
 */
// NOTE: Returns a plain RuntimeInfo object instead of [State, Actions] tuple.
// This hook is synchronous with no mutable actions — the tuple pattern would add
// unnecessary complexity for a read-only, always-ready data source.
const useRuntime = (): RuntimeInfo => {
  const context = useMemo(() => new URLSearchParams(window.location.hash.slice(1)), []);

  const opener = useMemo(() => window.opener as Window | null, []);

  const isAdapter = useMemo(
    () => context.has('origin') && (isExtension() || !!opener),
    [context, opener]
  );

  return {
    ready: true,
    context,
    opener,
    isAdapter,
  };
};

export { useRuntime };
