/**
 * The lock's contract, shared with the DOM `LockScreen`: a password check and
 * the wipe. Native adds biometrics on top (below). `LockContent.tsx` declares
 * its props inline today — the next touch on that file extends
 * `LockScreenPropsBase` here.
 */
import type { BiometricKind, BiometricUnlockResult, LockScreenPropsBase } from '@salmon/shared';
import type { ReactNode } from 'react';

export type { LockScreenPropsBase };

/** `LockOverlay` only owns coverage and the touch block — no lock behaviour. */
export interface LockOverlayProps {
  children: ReactNode;
}

/** `LockContent`'s own props: the shared unlock/wipe contract plus biometrics. */
export interface LockContentProps extends LockScreenPropsBase {
  /** Whether the lock screen is active */
  locked: boolean;
  /**
   * Called once the unlock wait's closing wave has fully left the screen after
   * a successful unlock. The owner holds the gate in its locked state until
   * this fires — releasing it earlier unmounts this component (and the wave)
   * mid-crossing, the same hard cut the password screen's parked route exists
   * to prevent. LoadingScreen's own watchdog guarantees the exit callback, so
   * the gate cannot be stranded.
   */
  onUnlockExited?: () => void;
  /** Biometric configuration */
  biometric?: BiometricConfig;
}

/**
 * Biometric configuration consumed by `LockContent`.
 *
 * Optional — without it the screen is password-only, which is exactly what the
 * DOM twin renders.
 *
 * There is no `onUnlockWithKey` beside it any more. A biometric unlock now
 * recovers the *password* and hands it to the same `onUnlock` a typed one
 * uses, so there is one unlock path in the app instead of two that could drift
 * apart — and they had: the biometric one carried its own copy of the vault's
 * salt and broke the moment the vault was re-encrypted.
 */
export interface BiometricConfig {
  /** Hardware present and the user has enrolled with the OS. */
  available: boolean;
  /** This wallet has a usable enrolment. */
  armed: boolean;
  /**
   * The user had biometrics on before the rebuild and has to arm it again.
   * Shown once, on the first locked screen after the update.
   */
  needsReArm?: boolean;
  /** Which sensor, for the button's label. */
  kind: BiometricKind | null;
  /** Prompts, and says precisely what happened. */
  unlock: () => Promise<BiometricUnlockResult>;
  /** Re-reads capabilities without prompting. */
  refresh: () => Promise<void>;
}
