/**
 * @fileoverview Platform-agnostic runtime hook with automatic environment detection.
 *
 * This module provides a unified interface for runtime context across both platforms:
 * - Browser extension (WXT/Chrome/Firefox) — this file, resolved by Vite
 * - React Native / Expo mobile app — `useRuntime.native.ts`, resolved by Metro
 *
 * The hook automatically detects the runtime environment and provides
 * appropriate adapter detection logic for each platform.
 *
 * @example
 * ```tsx
 * // Direct import - will use the correct implementation based on bundler config
 * import { useRuntime } from '@salmon/shared/hooks';
 *
 * // Or import the React Native implementation by name if needed:
 * import { useRuntime } from '@salmon/shared/hooks/useRuntime.native';
 * ```
 */

import { useMemo } from 'react';
import { isReactNative, isExtension } from '../utils/platform';

// Re-export shared types and constants so existing consumers are unaffected
export type { RuntimeInfo } from './useRuntime.shared';
export { ADAPTER_PREFIXES } from './useRuntime.shared';
import type { RuntimeInfo } from './useRuntime.shared';

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Web implementation of useRuntime.
 * Synchronously resolves context from URL hash.
 */
const useRuntimeWeb = (): RuntimeInfo => {
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

/**
 * Runtime hook for detecting adapter mode and connection context.
 *
 * This is the DOM implementation (the extension). For React Native,
 * use the platform-specific import or configure your bundler to resolve
 * `.native.ts` extensions automatically.
 *
 * @returns RuntimeInfo object containing:
 *   - `ready`: Whether the runtime is initialized
 *   - `context`: URL parameters for the connection
 *   - `opener`: Reference to window.opener (web only)
 *   - `isAdapter`: Whether running in adapter/dApp connection mode
 */
const useRuntime = (): RuntimeInfo => {
  // In environments where React Native is detected at runtime,
  // we need to throw an error since the async behavior is different.
  // The bundler should resolve to .native.ts for RN environments.
  if (isReactNative()) {
    throw new Error(
      'useRuntime: Detected React Native environment but using web implementation. ' +
        'Configure your bundler to resolve .native.ts extensions, or import from ' +
        "'@salmon/shared/hooks/useRuntime.native' directly."
    );
  }

  return useRuntimeWeb();
};

export { useRuntime };
