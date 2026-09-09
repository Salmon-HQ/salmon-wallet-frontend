import type { Account } from '../account';

/**
 * Props for the AccountsPanel component (platform-agnostic)
 */
export interface AccountsPanelPropsBase {
  /** Array of user accounts to display */
  accounts: Account[];
  /** The ID of the currently active account */
  activeAccountId: string;
  /** Callback when user selects/switches to an account */
  onSelectAccount: (accountId: string) => void;
  /** Callback when user taps edit on an account */
  onEditAccount: (accountId: string) => void;
  /**
   * Callback when user confirms deletion of an account. Receives the password
   * the confirmation collected when `requirePassword` is set.
   */
  onDeleteAccount: (accountId: string, password?: string) => void;
  /**
   * Whether the delete confirmation must ask for the password — true once the
   * cached vault key has expired (`useAccountRemoval`).
   */
  requirePassword?: boolean;
  /** Verifies the password the confirmation collected. */
  validatePassword?: (password: string) => Promise<boolean>;
  /** Callback when user taps "Add Account" */
  onAddAccount: () => void;
  /** Callback to navigate back */
  onBack: () => void;
}
