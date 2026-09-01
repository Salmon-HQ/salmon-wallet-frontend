import type { SecurityPanelPropsMobile, SettingsScreen } from '@salmon/shared';

/**
 * Props for the mobile SecurityPanel component.
 *
 * The two extras stay app-local rather than joining the shared contract:
 * routing between settings screens is the mobile stack's own concern, and the
 * biometric kind comes from `useBiometricAuth`, a mobile hook.
 */
export interface SecurityPanelProps extends SecurityPanelPropsMobile {
  /** Pushes another settings screen — recovery phrase, connected apps. */
  onNavigate: (screen: SettingsScreen) => void;
  /** What the device calls its biometry, for the row's subtitle. */
  biometricType?: 'fingerprint' | 'facial' | 'iris' | null;
}
