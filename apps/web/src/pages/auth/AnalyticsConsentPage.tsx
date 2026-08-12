import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsConsentPage as AuthAnalyticsConsentPage } from '@salmon/ui';
import { useAnalyticsConsent } from '@salmon/shared';

/**
 * First-run analytics consent — the final onboarding step before Success.
 * Persists the choice (opt-in or decline) and advances the flow either way.
 */
export function AnalyticsConsentPage(): React.ReactElement {
  const navigate = useNavigate();
  const { resolveConsentPrompt } = useAnalyticsConsent();

  const handleResolve = useCallback(
    (enabled: boolean) => {
      void resolveConsentPrompt(enabled);
      navigate('/auth/success', { replace: true });
    },
    [navigate, resolveConsentPrompt]
  );

  return (
    <AuthAnalyticsConsentPage
      onAccept={() => handleResolve(true)}
      onDecline={() => handleResolve(false)}
    />
  );
}
