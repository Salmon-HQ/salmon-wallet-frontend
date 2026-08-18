import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsConsentPage as AuthAnalyticsConsentPage } from '@salmon/ui';
import { useAnalyticsConsent } from '@salmon/shared';
import { useAuthFlow } from './AuthFlowContext';

/**
 * First-run analytics consent — the final onboarding step, after Success.
 * Both of Success's exits funnel through here (directly, or after the
 * derived-accounts detour), so consent is asked exactly once. Persists the
 * choice (opt-in or decline) and enters the app either way.
 */
export function AnalyticsConsentPage(): React.ReactElement {
  const navigate = useNavigate();
  const { resolveConsentPrompt } = useAnalyticsConsent();
  const { reset } = useAuthFlow();

  const handleResolve = useCallback(
    (enabled: boolean) => {
      void resolveConsentPrompt(enabled);
      reset();
      navigate('/home', { replace: true });
    },
    [navigate, reset, resolveConsentPrompt]
  );

  return (
    <AuthAnalyticsConsentPage
      onAccept={() => handleResolve(true)}
      onDecline={() => handleResolve(false)}
    />
  );
}
