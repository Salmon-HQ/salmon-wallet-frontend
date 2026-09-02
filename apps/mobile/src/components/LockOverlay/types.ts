/**
 * The lock's contract, shared with the DOM `LockScreen`: a password check and
 * the wipe. Native adds biometrics on top (below). `LockContent.tsx` declares
 * its props inline today — the next touch on that file extends
 * `LockScreenPropsBase` here.
 */
import type { LockScreenPropsBase } from '@salmon/shared';

export type { LockScreenPropsBase };

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
