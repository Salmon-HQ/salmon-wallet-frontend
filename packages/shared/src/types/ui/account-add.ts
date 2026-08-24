/**
 * Step state for the Add Account flow
 */
export type AccountAddStep =
  'select-method' | 'derive-scan' | 'import-seed' | 'import-private-key' | 'set-name' | 'complete';

/**
 * Props for the AccountAddPanel component (platform-agnostic)
 */
export interface AccountAddPanelPropsBase {
  /** Callback when the flow completes successfully */
  onComplete: () => void;
  /** Callback to navigate back / cancel */
  onBack: () => void;
}
