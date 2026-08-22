/**
 * The extension unlock screen — an adapter now, not an implementation.
 *
 * The screen itself is `LockScreen` in `@salmon/ui`; this file supplies only
 * what is genuinely the extension's: the unlock callback the popup passes in,
 * and the session-key cache. It and the web twin used to be near-verbatim
 * copies of the same 350 lines, diverging in exactly two places — both of
 * which were the web copy hardcoding a number the extension read from a token.
 */
import React, { useCallback } from 'react';
import { LockScreen } from '../../components';
import { getStashItem, STASH_KEYS, type DerivedKeyCache } from '@salmon/shared';
import { clearSessionKey, storeSessionKey } from '../../utils/sessionKeyCache';

interface LockPageProps {
  onUnlock: (password: string) => Promise<boolean>;
  /**
   * Accepted and discarded. Biometric unlock is mobile-only (spec 013,
   * decision 8): WebAuthn/passkey unlock here is separate work with its own
   * key-storage implications, not a layout decision.
   */
  onUnlockWithCachedKey?: (keyCache: DerivedKeyCache) => Promise<boolean>;
  onRemoveAllAccounts: () => Promise<void>;
}

export function LockPage({ onUnlock, onRemoveAllAccounts }: LockPageProps): React.ReactElement {
  const handleUnlocked = useCallback(async () => {
    try {
      const derivedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
      if (derivedKey) await storeSessionKey(derivedKey);
    } catch (cacheError) {
      console.warn('Failed to cache session key:', cacheError);
    }
  }, []);

  return (
    <LockScreen
      onUnlock={onUnlock}
      onUnlocked={handleUnlocked}
      onMount={clearSessionKey}
      onRemoveAllAccounts={onRemoveAllAccounts}
    />
  );
}

export default LockPage;
