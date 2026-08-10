import type { ReactNode } from 'react';

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

/**
 * Gate states representing the unified surface position
 */
export type GateState = 'locked' | 'collapsed' | 'settings' | 'wallets';

/**
 * Header configuration for expanded states (settings/wallets)
 */
export interface GateExpandedHeader {
  /** Title shown in the header bar */
  title?: string;
  /** Back button handler (shows chevron when defined) */
  onBack?: (() => void) | null;
  /** Close button handler */
  onClose: () => void;
}

/**
 * Props for the GateContainer component
 */
export interface GateContainerProps {
  /** Current state of the gate */
  state: GateState;
  /** Content to render when locked (full screen) */
  lockContent: ReactNode;
  /** Content to render when collapsed (header bar) */
  headerContent: ReactNode;
  /** Content to render when expanded to settings */
  settingsContent?: ReactNode;
  /** Content to render when expanded to wallet switcher */
  walletsContent?: ReactNode;
  /** Header config for expanded states */
  expandedHeader?: GateExpandedHeader;
  /** Called when the backdrop is pressed in expanded state */
  onBackdropPress?: () => void;
  /** Called when the unlock slide-up animation completes */
  onUnlockAnimationComplete?: () => void;
}
