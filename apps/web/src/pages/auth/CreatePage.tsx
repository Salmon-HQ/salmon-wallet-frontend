import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateWalletPage } from '@salmon/ui';
import { useAuthFlow } from './AuthFlowContext';

export function CreatePage(): React.ReactElement {
  const navigate = useNavigate();
  const { setMnemonic } = useAuthFlow();

  const handleComplete = useCallback(
    (mnemonic: string) => {
      setMnemonic(mnemonic);
      navigate('/auth/password');
    },
    [navigate, setMnemonic]
  );

  return <CreateWalletPage onComplete={handleComplete} onBack={() => navigate('/auth/select')} />;
}
