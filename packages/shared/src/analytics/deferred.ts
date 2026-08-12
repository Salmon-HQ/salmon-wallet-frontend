/**
 * Consent-first deferral for onboarding funnel events.
 *
 * `wallet_created` / `wallet_recovered` fire during onboarding, *before* the
 * first-run consent prompt is answered — so a plain `trackEvent` would drop
 * them (fail-closed) for every first-run user. Instead, when consent has not
 * been decided yet, the event name is parked in a device-only storage flag and
 * flushed (or discarded) when the prompt is answered. Nothing is transmitted or
 * queued before acceptance; the flag never leaves the device.
 */

import { getStorage, STORAGE_KEYS } from '../storage';
import { getAnalytics, trackEvent } from './client';

/** Onboarding funnel events eligible for consent-first deferral. */
export type DeferredOnboardingEvent = 'wallet_created' | 'wallet_recovered';

/**
 * Tracks an onboarding event, deferring it while the first-run consent prompt
 * is still unanswered. If consent was already decided (e.g. a returning user
 * creating another wallet), fires immediately like `trackEvent`. Never throws.
 */
export async function trackOnboardingEvent(event: DeferredOnboardingEvent): Promise<void> {
  const client = getAnalytics();
  if (!client) return;

  try {
    await client.whenReady();
    if (!client.getPrompted()) {
      await getStorage().setItem(STORAGE_KEYS.ANALYTICS_PENDING_ONBOARDING_EVENT, event);
      return;
    }
  } catch {
    // Best-effort: analytics must never surface a failure into onboarding.
    return;
  }

  trackEvent(event);
}

/**
 * Resolves a deferred onboarding event after the consent prompt is answered:
 * fires it when `accepted`, and always clears the device-only flag. No-op when
 * nothing was deferred. Never throws.
 */
export async function flushDeferredOnboardingEvent(accepted: boolean): Promise<void> {
  try {
    const storage = getStorage();
    const pending = await storage.getItem<DeferredOnboardingEvent>(
      STORAGE_KEYS.ANALYTICS_PENDING_ONBOARDING_EVENT
    );
    if (!pending) return;

    await storage.removeItem(STORAGE_KEYS.ANALYTICS_PENDING_ONBOARDING_EVENT);
    if (accepted && (pending === 'wallet_created' || pending === 'wallet_recovered')) {
      trackEvent(pending);
    }
  } catch {
    // Best-effort: a lost funnel event must never surface a failure.
  }
}
