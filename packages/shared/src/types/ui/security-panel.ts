/**
 * Props for the SecurityPanel component (platform-agnostic base)
 */
export interface SecurityPanelPropsBase {
  /** Callback to navigate back */
  onBack: () => void;
  /**
   * Callback after the password is successfully changed, handed the new
   * password so the platform can re-seal anything held under the old one.
   */
  onPasswordChanged?: (newPassword: string) => Promise<void>;
}
