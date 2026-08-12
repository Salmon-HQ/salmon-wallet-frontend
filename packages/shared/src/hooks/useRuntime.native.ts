import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import type { RuntimeInfo } from './useRuntime.shared';
import { ADAPTER_PREFIXES } from './useRuntime.shared';

/**
 * Runtime hook for React Native / Expo environments.
 *
 * This hook provides runtime context information for detecting
 * adapter mode through deep links on mobile platforms.
 *
 * The hook is asynchronous because it needs to resolve the initial
 * URL that opened the app. The `ready` flag indicates when
 * initialization is complete.
 *
 * @returns RuntimeInfo object with async initialization
 *
 * @example
 * ```tsx
 * import { useRuntime } from '@salmon/shared/hooks';
 *
 * function MyComponent() {
 *   const { ready, isAdapter } = useRuntime();
 *
 *   if (!ready) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (isAdapter) {
 *     // Handle adapter connection from deep link
 *   }
 * }
 * ```
 */
// NOTE: Returns a plain RuntimeInfo object instead of [State, Actions] tuple.
// This hook has no mutable actions — it only resolves initial URL state once.
// The tuple pattern would add unnecessary complexity for a read-only data source.
const useRuntime = (): RuntimeInfo => {
  const [ready, setReady] = useState(false);
  const [isAdapter, setIsAdapter] = useState(false);
  const [context, setContext] = useState<URLSearchParams>(new URLSearchParams());

  useEffect(() => {
    const initRuntime = async () => {
      try {
        const url = await Linking.getInitialURL();

        if (url) {
          // Check if the URL matches any adapter prefix
          const isAdapterUrl = ADAPTER_PREFIXES.some((prefix) => url.startsWith(prefix));
          setIsAdapter(isAdapterUrl);

          // Parse URL parameters from the deep link
          try {
            const urlObj = new URL(url);
            setContext(new URLSearchParams(urlObj.search || urlObj.hash.slice(1)));
          } catch {
            // URL parsing failed, use empty context
            setContext(new URLSearchParams());
          }
        }
      } catch (error) {
        // Linking.getInitialURL failed, continue with defaults
        console.warn('Failed to get initial URL:', error);
      } finally {
        setReady(true);
      }
    };

    initRuntime();
  }, []);

  return {
    ready,
    context,
    opener: null,
    isAdapter,
  };
};

export { useRuntime };
