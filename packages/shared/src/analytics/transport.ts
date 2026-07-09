/**
 * Default HTTP transport. Posts a batch to `${API_URL}/v1/events` using the
 * shared API client, so it inherits the same base-URL resolution the rest of
 * the wallet uses (`EXPO_PUBLIC_API_URL` / `VITE_API_URL`).
 *
 * On failure it re-throws so the client can decide whether to re-queue; it does
 * not log, to avoid analytics noise polluting the console or crash reporter.
 */

import { post } from '../api/client';
import type { AnalyticsBatch, AnalyticsTransport } from './types';

/** Endpoint path on salmon-api. Follows the existing `/v1/...` convention. */
export const EVENTS_ENDPOINT = '/v1/events';

/** Creates the production HTTP transport. */
export function createHttpTransport(): AnalyticsTransport {
  return {
    async send(batch: AnalyticsBatch): Promise<void> {
      await post(EVENTS_ENDPOINT, batch);
    },
  };
}

/** A transport that records batches in memory. Useful for tests and previews. */
export function createMemoryTransport(): AnalyticsTransport & { readonly batches: AnalyticsBatch[] } {
  const batches: AnalyticsBatch[] = [];
  return {
    batches,
    async send(batch: AnalyticsBatch): Promise<void> {
      batches.push(batch);
    },
  };
}
