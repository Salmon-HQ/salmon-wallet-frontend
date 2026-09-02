import type { PasswordStrength } from '../../crypto/password';
import type { Testable } from './testable';

/**
 * A secure field with a visibility toggle. The platform adds its own style
 * hooks; the behaviour — value, change, error line under the field, submit
 * on the keyboard's confirm — is this.
 */
export interface PasswordInputPropsBase extends Testable {
  /** Current password value */
  value: string;
  /** Callback when password text changes */
  onChangeText: (text: string) => void;
  /** Placeholder text (defaults to the lock's "Password") */
  placeholder?: string;
  /** Error message to display below the input */
  error?: string;
  /** Whether the input is editable (defaults to true) */
  editable?: boolean;
  /** Whether to auto-focus the input on mount */
  autoFocus?: boolean;
  /** Callback when the keyboard's confirm key is pressed */
  onSubmitEditing?: () => void;
}

/**
 * Three bars and a label: weak lights one in `status.danger`, medium two in
 * `status.warning`, strong three in `status.success`; the unlit bars are
 * `step.inactive`.
 */
export interface PasswordStrengthBarPropsBase {
  /** Password strength level */
  strength: PasswordStrength;
  /** Optional translation function (i18next) */
  t?: (key: string) => string;
}
