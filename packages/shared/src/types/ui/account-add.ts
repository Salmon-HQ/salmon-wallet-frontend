/**
 * Step state for the Add Account flow
 */
export type AccountAddStep =
  | 'select-method'
  | 'derive-scan'
  | 'import-seed'
  | 'import-private-key'
  | 'set-name'
  /** Vault key expired mid-flow; the password is asked for on its own screen. */
  | 'reauth'
  | 'complete';

/**
 * Props for the AccountAddPanel component (platform-agnostic)
 */
export interface AccountAddPanelPropsBase {
  /** Callback when the flow completes successfully */
  onComplete: () => void;
  /** Callback to navigate back / cancel */
  onBack: () => void;
}
