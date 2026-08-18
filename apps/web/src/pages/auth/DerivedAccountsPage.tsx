import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DerivedAccountsPage as AuthDerivedAccountsPage } from '@salmon/ui';
import { useAuthFlow } from './AuthFlowContext';

export function DerivedAccountsPage(): React.ReactElement {
  const navigate = useNavigate();
  const { reset } = useAuthFlow();

  // The detour still funnels through the analytics-consent step, so the
  // first-run ask cannot be dodged and is asked exactly once.
  const handleComplete = useCallback(() => {
    reset();
    navigate('/auth/analytics-consent', { replace: true });
  }, [navigate, reset]);

  return <AuthDerivedAccountsPage onComplete={handleComplete} />;
}
