import type { SecurityPanelPropsBase, SettingsScreen } from '@salmon/shared';

/**
 * The DOM half: no biometrics in a browser, so the score counts the
 * password alone. `onNavigate` reaches the recovery rows (backup, connected
 * apps) the way mobile's does.
 */
export interface SecurityPanelProps extends SecurityPanelPropsBase {
  onNavigate?: (screen: SettingsScreen) => void;
}
