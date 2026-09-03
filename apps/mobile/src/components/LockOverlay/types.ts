/**
 * The lock's contract, shared with the DOM `LockScreen`: a password check and
 * the wipe. Native adds biometrics on top (below). `LockContent.tsx` declares
 * its props inline today — the next touch on that file extends
 * `LockScreenPropsBase` here.
 */
import type { LockScreenPropsBase } from '@salmon/shared';
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
  /** Callback to unlock with cached derived key (biometric) */
  onUnlockWithKey?: (keyJson: string) => Promise<boolean>;
  /** Callback to get derived key after password unlock */
  onGetDerivedKey?: () => Promise<string | null>;
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
 * State representing the device's biometric capabilities.
 * Provided by the consumer's biometric hook (e.g., useBiometricAuth).
 */
export interface BiometricAuthState {
  /** Whether biometric hardware is available on the device */
  isAvailable: boolean;
  /** Whether a derived key is stored for biometric unlock */
  hasStoredKey: boolean;
  /** The type of biometric available (null if none) */
  biometricType: 'fingerprint' | 'facial' | 'iris' | null;
}

/**
 * Outcome of a biometric enrollment attempt.
 * Mirrors the hook's own result type (e.g., useBiometricAuth).
 */
export type BiometricEnrollResult = 'stored' | 'cancelled' | 'failed';

/**
 * Biometric authentication configuration consumed by LockContent.
 * Optional — if not provided, no biometric UI is shown. This keeps
 * the component platform-agnostic while the consumer provides the
 * platform-specific biometric implementation.
 */
export interface BiometricConfig {
  /** Current biometric state */
  state: BiometricAuthState;
  /** Authenticate with biometrics and retrieve the stored key */
  authenticateWithBiometric: () => Promise<string | null>;
  /** Store a derived key for future biometric unlock */
  storeKeyForBiometric: (derivedKeyJson: string) => Promise<BiometricEnrollResult>;
  /** Whether biometric unlock is enabled by the user */
  enableBiometric: boolean;
  /** Refresh the biometric state (useful after app resume) */
  refreshState: () => Promise<void>;
}
