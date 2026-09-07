/**
 * Biometric state, held once for the whole app.
 *
 * The old `useBiometricAuth` hook was called from three places — the app
 * layout, the settings panel registry and the onboarding enrolment screen —
 * and each call created its own React state over the same keychain. Toggling
 * Face ID in Settings updated the panel's copy and left the lock screen's copy
 * stale until the layout happened to remount, so the switch and the screen
 * could disagree about whether biometrics were on. One provider, mounted above
 * both route groups, removes the disagreement by construction.
 */

import type {
  BiometricArmResult,
  BiometricCapabilities,
  BiometricUnlockResult,
} from '@salmon/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { biometricStore, migrateLegacyRecords } from '../security/biometricStore';

interface BiometricContextValue extends BiometricCapabilities {
  /**
   * True for this session when the user had biometric unlock on before the
   * rebuild and now has to arm it again.
   *
   * The old records held a raw vault key and are swept on first launch; the
   * new scheme cannot re-seal without the password, so there is no way to
   * carry the enrolment over silently. Saying so is the least the app owes
   * someone whose Face ID quietly stopped being offered.
   */
  needsReArm: boolean;
  /** Seals the password behind a fresh biometric enrolment. */
  arm: (password: string) => Promise<BiometricArmResult>;
  /** Prompts and reports what happened. Refreshes `armed` on invalidation. */
  unlock: () => Promise<BiometricUnlockResult>;
  /** Drops the enrolment. */
  disarm: () => Promise<void>;
  /** Re-reads hardware, enrolment and armed state. Never prompts. */
  refresh: () => Promise<void>;
}

const INITIAL: BiometricCapabilities = {
  ready: false,
  available: false,
  kind: null,
  armed: false,
};

const BiometricContext = createContext<BiometricContextValue | null>(null);

export function BiometricProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities>(INITIAL);
  const [needsReArm, setNeedsReArm] = useState(false);

  const refresh = useCallback(async () => {
    setCapabilities(await biometricStore.probe());
  }, []);

  useEffect(() => {
    const start = async () => {
      // Before the first probe: the sweep decides whether this device still
      // holds pre-rebuild records, and `armed` should be read after they are
      // gone rather than beside them.
      const hadBiometrics = await migrateLegacyRecords();
      setNeedsReArm(hadBiometrics);
      await refresh();
    };
    void start();
  }, [refresh]);

  const arm = useCallback(
    async (password: string) => {
      const result = await biometricStore.arm(password);
      if (result === 'armed') setNeedsReArm(false);
      await refresh();
      return result;
    },
    [refresh]
  );

  const disarm = useCallback(async () => {
    await biometricStore.disarm();
    await refresh();
  }, [refresh]);

  const unlock = useCallback(async () => {
    const result = await biometricStore.unlock();
    // The store already deleted the records; this is the UI catching up, so
    // the Settings toggle stops claiming an enrolment that no longer exists.
    if (result.status === 'invalidated') {
      await refresh();
    }
    return result;
  }, [refresh]);

  const value = useMemo<BiometricContextValue>(
    () => ({ ...capabilities, needsReArm, arm, unlock, disarm, refresh }),
    [capabilities, needsReArm, arm, unlock, disarm, refresh]
  );

  return <BiometricContext.Provider value={value}>{children}</BiometricContext.Provider>;
}

export function useBiometric(): BiometricContextValue {
  const value = useContext(BiometricContext);
  if (!value) {
    throw new Error('useBiometric must be used inside a BiometricProvider');
  }
  return value;
}
