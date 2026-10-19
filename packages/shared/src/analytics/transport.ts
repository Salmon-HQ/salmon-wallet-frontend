/**
 * Default HTTP transport. Posts a batch to `{base}/v1/events`, where `{base}` is
 * the dedicated analytics URL when one is configured (`EXPO_PUBLIC_ANALYTICS_URL`
 * / `VITE_ANALYTICS_URL`, see {@link getAnalyticsUrl}) and the wallet's API URL
 * otherwise.
 *
 * It uses `fetch` with `keepalive`, so a request started as an extension window
 * closes still arrives (axios' XHR is cancelled on unload), and a `text/plain`
 * body with no other header, so a cross-origin call needs no CORS preflight; the
 * backend parses the JSON whatever the content type.
 *
 * A non-2xx answer or a timeout throws so the client can re-queue; it does not
 * log, to avoid analytics noise polluting the console or crash reporter.
 */

import { getAnalyticsUrl, getApiUrl } from '../api/config';
import type { AnalyticsBatch, AnalyticsTransport } from './types';

/** Endpoint path on salmon-api. Follows the existing `/v1/...` convention. */
export const EVENTS_ENDPOINT = '/v1/events';

/** Timeout for an analytics POST. Short: delivery is best-effort. */
const ANALYTICS_POST_TIMEOUT_MS = 10_000;

/** Creates the production HTTP transport. */
export function createHttpTransport(): AnalyticsTransport {
  // Resolved once at construction (app boot).
  const url = `${getAnalyticsUrl() ?? getApiUrl()}${EVENTS_ENDPOINT}`;

  return {
    async send(batch: AnalyticsBatch): Promise<void> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ANALYTICS_POST_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify(batch),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`analytics ingest answered ${response.status}`);
      } finally {
        clearTimeout(timer);
      }
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
