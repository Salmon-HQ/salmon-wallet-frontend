import { QueryClient } from '@tanstack/react-query';

/**
 * How long an unused cache entry survives before eviction.
 *
 * A wallet's cache entries are per-account **and** per-network
 * (`queryKeys.balance({ accountId, networkId })`), so switching chains always
 * lands on a different key. At the previous 5 minutes, coming back to a chain
 * after a short detour found nothing and dropped to skeletons. 24h outlives any
 * realistic session, so returning to a chain the user already visited paints
 * last-known data immediately and revalidates behind it.
 *
 * Safe because nothing here is *trusted* stale: every consumer refetches on
 * mount/focus, and no signing path reads balances from cache — quotes and
 * transactions are built from fresh RPC data.
 */
const GC_TIME_MS = 24 * 60 * 60 * 1000;

/**
 * Default freshness window. Non-zero so a remount, a focus, or a back-navigation
 * within a few seconds reuses what is already on screen instead of re-fetching.
 * Deliberately short — a wallet balance the user is watching should still catch
 * up quickly — and per-query overrides (balance 15s, NFTs 60s) still win.
 */
const STALE_TIME_MS = 5_000;

/**
 * Creates the app-wide QueryClient. Mounted once per app root (per side-panel
 * mount in the extension).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        refetchOnWindowFocus: true,
        retry: 1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
    },
  });
}
