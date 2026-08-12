/**
 * Default HTTP transport. Posts a batch to `${API_URL}/v1/events` using the
 * shared API client, so it inherits the same base-URL resolution the rest of
 * the wallet uses (`EXPO_PUBLIC_API_URL` / `VITE_API_URL`).
 *
 * When a dedicated analytics URL is configured (`EXPO_PUBLIC_ANALYTICS_URL` /
 * `VITE_ANALYTICS_URL`), it posts there instead — over its own axios instance —
 * so events can be routed to a separate sink while the wallet keeps talking to
 * its normal backend. See {@link getAnalyticsUrl}.
 *
 * On failure it re-throws so the client can decide whether to re-queue; it does
 * not log, to avoid analytics noise polluting the console or crash reporter.
 */

import { axios, post } from '../api/client';
import { getAnalyticsUrl } from '../api/config';
import type { AnalyticsBatch, AnalyticsTransport } from './types';

/** Endpoint path on salmon-api. Follows the existing `/v1/...` convention. */
export const EVENTS_ENDPOINT = '/v1/events';

/** Timeout for a dedicated-URL analytics POST. Short: delivery is best-effort. */
const ANALYTICS_POST_TIMEOUT_MS = 10_000;

/** Creates the production HTTP transport. */
export function createHttpTransport(): AnalyticsTransport {
  // Resolved once at construction (app boot). A dedicated URL routes events to a
  // separate sink; otherwise the shared API client (`API_URL`) is used.
  const analyticsUrl = getAnalyticsUrl();

  if (analyticsUrl) {
    const client = axios.create({
      baseURL: analyticsUrl,
      timeout: ANALYTICS_POST_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });
    return {
      async send(batch: AnalyticsBatch): Promise<void> {
        await client.post(EVENTS_ENDPOINT, batch);
      },
    };
  }

  return {
    async send(batch: AnalyticsBatch): Promise<void> {
      await post(EVENTS_ENDPOINT, batch);
    },
  };
}

/** A transport that records batches in memory. Useful for tests and previews. */
export function createMemoryTransport(): AnalyticsTransport & {
  readonly batches: AnalyticsBatch[];
} {
  const batches: AnalyticsBatch[] = [];
  return {
    batches,
    async send(batch: AnalyticsBatch): Promise<void> {
      batches.push(batch);
    },
  };
}
