import type { CSSProperties, ReactNode } from 'react';
import type { ButtonPropsBase, TextButtonPropsBase } from '@salmon/shared';

export interface PrimaryButtonProps extends ButtonPropsBase {
  /** DOM-only: renders at `width: auto` instead of the default 100%. */
  fullWidth?: boolean;
  style?: CSSProperties;
  className?: string;
}

/**
 * `danger` is the destructive variant: the same outlined control, drawn in
 * danger ink with a danger edge. `danger-fill` is the filled destructive
 * control — a `danger-700` plane, not an outline. Mirrors mobile's
 * `SecondaryButtonTone`.
 */
export type SecondaryButtonTone = 'default' | 'danger' | 'danger-fill';

export interface SecondaryButtonProps extends ButtonPropsBase {
  tone?: SecondaryButtonTone;
  /** DOM-only: renders at `width: auto` instead of the default 100%. */
  fullWidth?: boolean;
  style?: CSSProperties;
  className?: string;
  /** Announced consequence — the third channel a destructive control needs. */
  accessibilityHint?: string;
  /** Optional glyph before the label. The label stays the accessible name. */
  icon?: ReactNode;
  /**
   * Optional glyph after the label — a caret when the control opens a picker
   * rather than acting directly.
   */
  trailingIcon?: ReactNode;
}

export interface TextButtonProps extends TextButtonPropsBase {
  /** DOM-only: renders at `width: 100%` instead of the default auto. */
  fullWidth?: boolean;
  style?: CSSProperties;
  className?: string;
  /** Optional glyph rendered before the label. The label stays the accessible name. */
  icon?: ReactNode;
}
