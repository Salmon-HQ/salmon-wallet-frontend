import type { CSSProperties } from 'react';
import type { TextInputPropsBase } from '@salmon/shared';

/**
 * The DOM half of `TextInputPropsBase`: the contract plus a style. The card
 * is the field's shape owner, so it is what wears the shared focus shell.
 */
export interface TextInputProps extends TextInputPropsBase {
  style?: CSSProperties;
  className?: string;
}
