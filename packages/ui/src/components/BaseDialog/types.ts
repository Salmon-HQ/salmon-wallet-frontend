/**
 * Type definitions for BaseDialog compound component
 */

import type { ReactNode } from 'react';

// ============================================================================
// Root Dialog Props
// ============================================================================

export interface BaseDialogProps {
  /** Whether the dialog is visible */
  visible: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
  /**
   * Whether backdrop clicks and Escape may dismiss the dialog. Set to false
   * while an irreversible action is in flight — explicit controls still work.
   * Defaults to true.
   */
  dismissible?: boolean;
  /** Dialog content (use BaseDialog sub-components) */
  children: ReactNode;
  /** Optional aria-labelledby for accessibility */
  ariaLabelledBy?: string;
}

// ============================================================================
// Header Component Props
// ============================================================================

export interface HeaderProps {
  /** Header title */
  title: string;
  /** Whether to show warning icon (for danger actions) */
  showWarning?: boolean;
  /**
   * Whether the corner close control is drawn. Danger dialogs turn it off:
   * they already carry an explicit, prominent Cancel, and two dismissal
   * affordances make the reader choose between two things that do the same.
   */
  showClose?: boolean;
  /** Optional close handler (uses context if not provided) */
  onClose?: () => void;
}

// ============================================================================
// Content Component Props
// ============================================================================

export interface ContentProps {
  /** Content to display */
  children: ReactNode;
}

// ============================================================================
// Actions Component Props
// ============================================================================

export interface ActionsProps {
  /** Action buttons */
  children: ReactNode;
  /**
   * Stack the buttons in one full-width column instead of splitting the row.
   * Danger dialogs use this: it stops long destructive labels wrapping in the
   * extension popup, and it makes the vertical order a statement of preference.
   */
  stacked?: boolean;
}

// ============================================================================
// TextField Component Props
// ============================================================================

export interface TextFieldProps {
  /** Field label */
  label: string;
  /** Field value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Input type */
  type?: 'text' | 'password';
  /** Whether field has error */
  error?: boolean;
  /** Error message */
  helperText?: string;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Whether to auto-focus */
  autoFocus?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Optional key down handler */
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

// ============================================================================
// Button Component Props
// ============================================================================

export interface CancelButtonProps {
  /** Button text */
  children: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /**
   * Give this button the committing action's weight. Set on danger dialogs,
   * where backing out is the recommended outcome.
   */
  prominent?: boolean;
  /** Take the initial focus, so Enter resolves the dialog safely */
  autoFocus?: boolean;
  /** Stable test id, forwarded to data-testid */
  testID?: string;
}

export interface ActionButtonProps {
  /** Button text */
  children: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether this is a danger/destructive action */
  isDanger?: boolean;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Stable test id, forwarded to data-testid */
  testID?: string;
}
