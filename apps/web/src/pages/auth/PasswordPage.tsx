import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PasswordPage as AuthPasswordPage } from '@salmon/ui';
import { DerivedKeyCache, getStashItem, STASH_KEYS, useAccountsContext } from '@salmon/shared';
import { useAuthFlow } from './AuthFlowContext';
import { clearSessionKey, storeSessionKey } from '../../utils/sessionKeyCache';

export function PasswordPage(): React.ReactElement {
  const navigate = useNavigate();
  const { mnemonic, flowType, setJustCreated } = useAuthFlow();
  const [, actions] = useAccountsContext();

  const handleCreating = useCallback(() => {
    setJustCreated(true);
  }, [setJustCreated]);

  const handleSuccess = useCallback(() => {
    void (async () => {
      try {
        const derivedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);

        if (derivedKey) {
          const unlocked = await actions.unlockWithCachedKey(derivedKey);

          if (unlocked) {
            await storeSessionKey(derivedKey);
          } else {
            await clearSessionKey();
          }
        }
      } catch (error) {
        console.warn('Failed to finalize onboarding session:', error);
      }

      navigate('/auth/analytics-consent');
    })();
  }, [actions, navigate]);

  const handleBack = useCallback(() => {
    navigate(flowType === 'create' ? '/auth/create' : '/auth/recover');
  }, [flowType, navigate]);

  return (
    <AuthPasswordPage
      mnemonic={mnemonic}
      flowType={flowType}
      onCreating={handleCreating}
      onSuccess={handleSuccess}
      onBack={handleBack}
    />
  );
}
