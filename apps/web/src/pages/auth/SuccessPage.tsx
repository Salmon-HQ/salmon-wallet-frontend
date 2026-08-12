import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuccessPage as AuthSuccessPage } from '@salmon/ui';
import { useAuthFlow } from './AuthFlowContext';

export function SuccessPage(): React.ReactElement {
  const navigate = useNavigate();
  const { reset } = useAuthFlow();

  const handleGoToWallet = useCallback(() => {
    reset();
    navigate('/home', { replace: true });
  }, [navigate, reset]);

  const handleCheckDerived = useCallback(() => {
    navigate('/auth/derived');
  }, [navigate]);

  return <AuthSuccessPage onGoToWallet={handleGoToWallet} onCheckDerived={handleCheckDerived} />;
}
