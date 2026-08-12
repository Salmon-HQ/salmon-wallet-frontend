/**
 * "First-time" activation events.
 *
 * Some funnel events matter only the first time they happen per install — the
 * first swap, the first send, the first time the receive screen is opened. This
 * helper emits such an event at most once, guarded by a persisted flag, and —
 * like {@link trackEvent} — is a total no-op without consent.
 *
 * The flag is written only after the event has actually been emitted (which
 * requires consent), so a user who first acts *before* opting in is still
 * counted on their first action *after* opting in.
 */

import { getStorage, type StorageKey } from '../storage';
import { getAnalytics, trackEvent } from './client';
import type { AnalyticsEventName } from './events';
import type { AnalyticsProps } from './types';

/**
 * Emits `event` once per install, keyed by `flagKey`. No-op without consent
 * (and without burning the flag), or if it has already fired. Never throws.
 */
export async function trackFirstTime(
  event: AnalyticsEventName,
  flagKey: StorageKey,
  props?: AnalyticsProps
): Promise<void> {
  // Gate on consent before touching the flag: without consent we neither emit
  // nor mark the "first" as spent, preserving it until the user opts in.
  const client = getAnalytics();
  if (!client || !client.getConsent()) return;

  try {
    const storage = getStorage();
    const alreadyReported = await storage.getItem<boolean>(flagKey);
    if (alreadyReported) return;
    await storage.setItem(flagKey, true);
    trackEvent(event, props);
  } catch {
    // Best-effort: analytics must never surface a failure into the app.
  }
}
