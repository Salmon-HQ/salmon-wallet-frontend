/**
 * Props for the SecurityPanel component (platform-agnostic base)
 */
export interface SecurityPanelPropsBase {
  /** Callback to navigate back */
  onBack: () => void;
  /** Callback after password is successfully changed */
  onPasswordChanged?: () => Promise<void>;
}
