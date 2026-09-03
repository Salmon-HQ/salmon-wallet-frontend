import type { SecurityPanelPropsBase, SettingsScreen } from '@salmon/shared';

/**
 * Props for the mobile SecurityPanel component.
 *
 * The extras stay app-local rather than joining the shared contract:
 * routing between settings screens is the mobile stack's own concern, and
 * biometrics come from `useBiometricAuth`, a mobile hook.
 */
export interface SecurityPanelProps extends SecurityPanelPropsBase {
  /** Pushes another settings screen — recovery phrase, connected apps. */
  onNavigate: (screen: SettingsScreen) => void;
  /** Whether biometric auth is available on this device */
  isBiometricAvailable: boolean;
  /** Whether biometric auth is currently enabled */
  isBiometricEnabled: boolean;
  /** Callback when user toggles biometric auth */
  onToggleBiometric: (enabled: boolean) => void;
  /** What the device calls its biometry, for the row's subtitle. */
  biometricType?: 'fingerprint' | 'facial' | 'iris' | null;
}
