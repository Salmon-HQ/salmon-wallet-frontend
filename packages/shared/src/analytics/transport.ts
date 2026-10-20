/**
 * Default HTTP transport. Posts a batch to `{base}/v1/events`, where `{base}`
 * depends on whether this is a store build (see {@link getAnalyticsUrl}).
 *
 * It uses `fetch` with `keepalive`, so a request started as an extension window
 * closes still arrives (axios' XHR is cancelled on unload), and a `text/plain`
 * body with no other header, so a cross-origin call needs no CORS preflight; the
 * backend parses the JSON whatever the content type.
 *
 * A non-2xx answer or a timeout throws so the client can re-queue; it does not
 * log, to avoid analytics noise polluting the console or crash reporter.
 */

import { getAnalyticsUrl } from '../api/config';
import type { AnalyticsBatch, AnalyticsTransport } from './types';

/** Endpoint path on salmon-api. Follows the existing `/v1/...` convention. */
export const EVENTS_ENDPOINT = '/v1/events';

/** The backend refused the batch itself (a 4xx other than 408 or 429): resending it cannot help. */
export class AnalyticsIngestRefusedError extends Error {
  constructor(readonly status: number) {
    super(`analytics ingest refused the batch with ${status}`);
    this.name = 'AnalyticsIngestRefusedError';
  }
}

/** Whether a failed send is worth repeating: a network error, a timeout, a 5xx, 408 or 429. */
export function isRetryable(error: unknown): boolean {
  return !(error instanceof AnalyticsIngestRefusedError);
}

/** Timeout for an analytics POST. Short: delivery is best-effort. */
const ANALYTICS_POST_TIMEOUT_MS = 10_000;

/** Creates the HTTP transport. Leaving out `storeBuild` can only send to staging. */
export function createHttpTransport(storeBuild = false): AnalyticsTransport {
  const url = `${getAnalyticsUrl(storeBuild)}${EVENTS_ENDPOINT}`;

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
        const { status } = response;
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
          throw new AnalyticsIngestRefusedError(status);
        }
        if (!response.ok) throw new Error(`analytics ingest answered ${status}`);
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
