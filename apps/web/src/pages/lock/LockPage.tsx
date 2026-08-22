/**
 * The web unlock screen — an adapter now, not an implementation.
 *
 * The screen itself is `LockScreen` in `@salmon/ui`; this file supplies only
 * what is genuinely web's: how a password is checked, where to go afterwards,
 * and the session-key cache. It and the extension's twin used to be
 * near-verbatim copies of the same 350 lines.
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockScreen } from '@salmon/ui';
import { getStashItem, STASH_KEYS, useAccountsContext, type DerivedKeyCache } from '@salmon/shared';
import { clearSessionKey, storeSessionKey } from '../../utils/sessionKeyCache';

export function LockPage(): React.ReactElement {
  const navigate = useNavigate();
  const [, actions] = useAccountsContext();

  const handleUnlocked = useCallback(async () => {
    try {
      const derivedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
      if (derivedKey) await storeSessionKey(derivedKey);
    } catch {
      /* cache miss is ok */
    }
    navigate('/home', { replace: true });
  }, [navigate]);

  const handleRemoveAllAccounts = useCallback(async () => {
    await actions.removeAllAccounts();
    navigate('/auth/select', { replace: true });
  }, [actions, navigate]);

  return (
    <LockScreen
      onUnlock={actions.unlockAccounts}
      onUnlocked={handleUnlocked}
      onMount={clearSessionKey}
      onRemoveAllAccounts={handleRemoveAllAccounts}
    />
  );
}

export default LockPage;
