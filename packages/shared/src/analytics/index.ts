/**
 * Anonymous, opt-in usage analytics.
 *
 * A framework-agnostic client that emits a fixed catalogue of behavioural events
 * with categorical props only. It never sends wallet addresses, balances,
 * amounts, or any identifier derived from the seed. Off by default; requires
 * explicit consent (`useAnalyticsConsent` on the React side).
 *
 * @example
 * ```ts
 * import { initAnalytics, trackEvent } from '@salmon/shared';
 *
 * initAnalytics({ platform: 'mobile', appVersion: APP_VERSION });
 * // ...after the user opts in via Settings...
 * trackEvent('swap_completed', { from_chain: 'solana', to_chain: 'solana', success: true });
 * ```
 */

export {
  ANALYTICS_EVENTS,
  CHAINS,
  AMOUNT_BUCKETS,
  ALLOWED_PROP_KEYS,
  PROP_ENUMS,
  isAnalyticsEvent,
  isAllowedPropKey,
  toAmountBucket,
  type AnalyticsEventName,
  type Chain,
  type AmountBucket,
  type AllowedPropKey,
} from './events';

export {
  validateEvent,
  safeValidateEvent,
  isAddressLike,
  AnalyticsValidationError,
  MAX_PROP_STRING_LENGTH,
  type ValidatedEvent,
} from './schema';

export {
  getOrCreateInstallId,
  clearInstallId,
  createSessionId,
} from './install-id';

export {
  createHttpTransport,
  createMemoryTransport,
  EVENTS_ENDPOINT,
} from './transport';

export {
  initAnalytics,
  getAnalytics,
  isAnalyticsInitialized,
  trackEvent,
  resetAnalytics,
  type AnalyticsClient,
} from './client';

export { trackFirstTime } from './first-time';

export {
  trackOnboardingEvent,
  flushDeferredOnboardingEvent,
  type DeferredOnboardingEvent,
} from './deferred';

export type {
  AnalyticsPlatform,
  AnalyticsPropValue,
  AnalyticsProps,
  AnalyticsContext,
  AnalyticsEventPayload,
  AnalyticsBatch,
  AnalyticsTransport,
  AnalyticsClientConfig,
} from './types';
