/**
 * PasswordInput types, on the DOM — the shared contract plus the DOM's own
 * style hooks. The mobile twin reads the same `*PropsBase`.
 */
import type { PasswordInputPropsBase, PasswordStrengthBarPropsBase } from '@salmon/shared';

export interface PasswordInputProps extends PasswordInputPropsBase {
  /** Additional CSS class */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

export interface PasswordStrengthBarProps extends PasswordStrengthBarPropsBase {
  /** Additional CSS class */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}
