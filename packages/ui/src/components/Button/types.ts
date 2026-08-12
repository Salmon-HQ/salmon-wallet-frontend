import type { CSSProperties, ReactNode } from 'react';
import type { Testable } from '@salmon/shared';

/**
 * Base button props interface
 */
export interface ButtonBaseProps extends Testable {
  /** Click handler */
  onClick?: () => void;
  /** Button content */
  children: ReactNode;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Optional custom styles */
  style?: CSSProperties;
  /** Optional CSS class name */
  className?: string;
  /** Full width button */
  fullWidth?: boolean;
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';
}

export interface PrimaryButtonProps extends ButtonBaseProps {}

export interface SecondaryButtonProps extends ButtonBaseProps {
  /** Variant style */
  variant?: 'filled' | 'outline';
}

export interface TextButtonProps extends Omit<ButtonBaseProps, 'fullWidth'> {
  /** Custom text color */
  color?: string;
}
