import type { BiometricKind, SecurityPanelPropsBase, SettingsScreen } from '@salmon/shared';

/**
 * Props for the mobile SecurityPanel component.
 *
 * The extras stay app-local rather than joining the shared contract:
 * routing between settings screens is the mobile stack's own concern, and
 * biometrics come from the mobile keychain.
 */
export interface SecurityPanelProps extends SecurityPanelPropsBase {
  /** Pushes another settings screen — recovery phrase, connected apps. */
  onNavigate: (screen: SettingsScreen) => void;
  /** Whether biometric auth is available on this device */
  isBiometricAvailable: boolean;
  /** Whether this wallet currently has a usable biometric enrolment. */
  isBiometricEnabled: boolean;
  /**
   * Turning it on needs the password — it is what gets sealed — so the panel
   * hands the row's intent up and the owner opens the confirm gate. Turning it
   * off needs nothing.
   */
  onToggleBiometric: (enabled: boolean) => void;
  /** What the device calls its biometry, for the row's subtitle. */
  biometricType?: BiometricKind | null;
}
