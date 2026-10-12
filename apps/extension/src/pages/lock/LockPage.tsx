/**
 * The extension unlock screen — an adapter now, not an implementation.
 *
 * The screen itself is `LockScreen` in `@salmon/ui`; this file supplies only
 * what is genuinely the extension's: the unlock callback the popup passes in,
 * and the sweep of the session-key record an older build left behind. It and
 * the web twin used to be near-verbatim copies of the same 350 lines, diverging in exactly two places — both of
 * which were the web copy hardcoding a number the extension read from a token.
 */
import React from 'react';
import { LockScreen } from '../../components';
import type { DerivedKeyCache } from '@salmon/shared';
import { clearSessionKey } from '../../utils/sessionKeyCache';

interface LockPageProps {
  onUnlock: (password: string) => Promise<boolean>;
  /**
   * Accepted and discarded. Biometric unlock is mobile-only (spec 013,
   * decision 8): WebAuthn/passkey unlock here is separate work with its own
   * key-storage implications, not a layout decision.
   */
  onUnlockWithCachedKey?: (keyCache: DerivedKeyCache) => Promise<boolean>;
  onRemoveAllAccounts: () => Promise<void>;
  /**
   * Fired once the unlock wait has finished leaving the screen. The popup
   * holds this page mounted until then — see `unlockHeld` in `popup/App.tsx`.
   */
  onUnlockExited?: () => void;
}

export function LockPage({
  onUnlock,
  onRemoveAllAccounts,
  onUnlockExited,
}: LockPageProps): React.ReactElement {
  return (
    <LockScreen
      onUnlock={onUnlock}
      onUnlocked={onUnlockExited}
      onMount={clearSessionKey}
      onRemoveAllAccounts={onRemoveAllAccounts}
    />
  );
}

export default LockPage;
