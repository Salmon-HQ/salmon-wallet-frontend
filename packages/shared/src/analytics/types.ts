/**
 * Shared types for the anonymous usage-analytics client.
 */

import type { AnalyticsEventName } from './events';

/** Platform the wallet is running on. Part of the batch context, not per-event. */
export type AnalyticsPlatform = 'extension' | 'mobile';

/** Prop values are deliberately restricted to strings and booleans — no numbers. */
export type AnalyticsPropValue = string | boolean;

export type AnalyticsProps = Record<string, AnalyticsPropValue>;

/**
 * Identity-less context attached to every batch. `installId` is a random
 * per-install id (not derived from any wallet); `sessionId` is ephemeral and
 * rotates per session.
 */
export interface AnalyticsContext {
  installId: string;
  sessionId: string;
  platform: AnalyticsPlatform;
  appVersion: string;
}

/** A single validated event ready to leave the device. */
export interface AnalyticsEventPayload {
  event: AnalyticsEventName;
  props: AnalyticsProps;
  /** Client epoch milliseconds when the event was recorded. */
  ts: number;
}

/** Wire shape POSTed to `${API_URL}/v1/events`. */
export interface AnalyticsBatch {
  context: AnalyticsContext;
  events: AnalyticsEventPayload[];
}

/**
 * Pluggable delivery mechanism. The default implementation posts to the backend;
 * tests inject a fake. Implementations MUST swallow their own errors — analytics
 * must never surface a failure into the app.
 */
export interface AnalyticsTransport {
  send(batch: AnalyticsBatch): Promise<void>;
}

/** Options for {@link initAnalytics}. */
export interface AnalyticsClientConfig {
  platform: AnalyticsPlatform;
  appVersion: string;
  /** Delivery mechanism. Defaults to the HTTP transport when omitted. */
  transport?: AnalyticsTransport;
  /** Max events buffered before an eager flush. Default 20. */
  batchSize?: number;
  /** Idle flush interval in ms. Default 30_000. */
  flushIntervalMs?: number;
  /** When true, invalid events throw instead of being dropped. Default: dev only. */
  strict?: boolean;
}
