import type { CSSProperties, ReactNode } from 'react';
import type {
  ButtonPropsBase,
  SecondaryButtonPropsBase,
  TextButtonPropsBase,
} from '@salmon/shared';

export type { SecondaryButtonTone } from '@salmon/shared';

export interface PrimaryButtonProps extends ButtonPropsBase {
  fullWidth?: boolean;
  style?: CSSProperties;
  className?: string;
}

export interface SecondaryButtonProps extends SecondaryButtonPropsBase {
  fullWidth?: boolean;
  style?: CSSProperties;
  className?: string;
}

export interface TextButtonProps extends TextButtonPropsBase {
  fullWidth?: boolean;
  style?: CSSProperties;
  className?: string;
  /** @deprecated read from the contract; kept so the type keeps its shape */
  icon?: ReactNode;
}
