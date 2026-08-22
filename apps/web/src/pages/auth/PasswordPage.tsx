import React, { useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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

      navigate('/auth/success');
    })();
  }, [actions, navigate]);

  const handleBack = useCallback(() => {
    navigate(flowType === 'create' ? '/auth/create' : '/auth/recover');
  }, [flowType, navigate]);

  // The mnemonic lives in memory only, so a reload, a bookmark, or browser-back
  // can land here holding nothing — and this screen writes the vault. Creating a
  // wallet from an empty phrase would produce one whose recovery phrase was
  // never shown, so send the user back to the start of the flow instead.
  if (!mnemonic) {
    return <Navigate to="/auth/select" replace />;
  }

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
