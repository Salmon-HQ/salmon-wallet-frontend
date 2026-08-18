import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuccessPage as AuthSuccessPage } from '@salmon/ui';

export function SuccessPage(): React.ReactElement {
  const navigate = useNavigate();

  // Leaves through the analytics-consent step, which is what enters the app.
  // Consent comes after success so the first-run ask never interrupts the
  // congratulations moment.
  const handleGoToWallet = useCallback(() => {
    navigate('/auth/analytics-consent', { replace: true });
  }, [navigate]);

  const handleCheckDerived = useCallback(() => {
    navigate('/auth/derived');
  }, [navigate]);

  return <AuthSuccessPage onGoToWallet={handleGoToWallet} onCheckDerived={handleCheckDerived} />;
}
