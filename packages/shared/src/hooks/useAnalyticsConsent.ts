/**
 * React binding for anonymous usage-analytics consent.
 *
 * Reads the current opt-in state from the analytics singleton and exposes a
 * setter that persists the choice. Safe to use on platforms where analytics was
 * never initialised — it simply reports `false` and the setter is a no-op.
 *
 * @module hooks/useAnalyticsConsent
 */

import { useCallback, useEffect, useState } from 'react';
import { getAnalytics, flushDeferredOnboardingEvent } from '../analytics';

export interface UseAnalyticsConsentResult {
  /** Whether the user has opted in to anonymous usage analytics. */
  consent: boolean;
  /** Whether the persisted consent state has finished loading. */
  isLoading: boolean;
  /** Grants or withdraws consent, persisting the choice. */
  setConsent: (enabled: boolean) => Promise<void>;
  /** Convenience flip of the current value. */
  toggleConsent: () => Promise<void>;
  /** True when the first-run consent prompt has not been answered yet. */
  needsConsentPrompt: boolean;
  /** Answers the first-run prompt: sets consent and marks it as decided. */
  resolveConsentPrompt: (enabled: boolean) => Promise<void>;
}

export function useAnalyticsConsent(): UseAnalyticsConsentResult {
  const [consent, setConsentState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsConsentPrompt, setNeedsConsentPrompt] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const client = getAnalytics();

    if (!client) {
      setIsLoading(false);
      return;
    }

    client
      .whenReady()
      .then(() => {
        if (active) {
          setConsentState(client.getConsent());
          setNeedsConsentPrompt(!client.getPrompted());
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const setConsent = useCallback(async (enabled: boolean): Promise<void> => {
    const client = getAnalytics();
    if (!client) return;
    await client.setConsent(enabled);
    setConsentState(client.getConsent());
  }, []);

  const toggleConsent = useCallback((): Promise<void> => {
    return setConsent(!getAnalytics()?.getConsent());
  }, [setConsent]);

  const resolveConsentPrompt = useCallback(async (enabled: boolean): Promise<void> => {
    const client = getAnalytics();
    setNeedsConsentPrompt(false);
    if (!client) return;
    await client.setConsent(enabled);
    await client.markPrompted();
    // Onboarding events deferred until this answer: fire on accept, discard on decline.
    await flushDeferredOnboardingEvent(enabled);
    setConsentState(client.getConsent());
  }, []);

  return { consent, isLoading, setConsent, toggleConsent, needsConsentPrompt, resolveConsentPrompt };
}
