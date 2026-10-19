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
 * initAnalytics({ platform: 'ios', appVersion: APP_VERSION, storeBuild: Updates.channel === 'production' });
 * // ...after the user opts in via Settings...
 * trackEvent('send_completed', { chain: 'solana', success: true });
 * ```
 */

export {
  ANALYTICS_EVENTS,
  CHAINS,
  ALLOWED_PROP_KEYS,
  PROP_ENUMS,
  isAnalyticsEvent,
  isAllowedPropKey,
  type AnalyticsEventName,
  type Chain,
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

export { getOrCreateInstallId, clearInstallId, createSessionId } from './install-id';

export { createHttpTransport, createMemoryTransport, EVENTS_ENDPOINT } from './transport';

export {
  initAnalytics,
  getAnalytics,
  isAnalyticsInitialized,
  trackEvent,
  resetAnalytics,
  type AnalyticsClient,
} from './client';

export { trackFirstSwapCompleted, trackFirstTime } from './first-time';

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
