import type { CSSProperties } from 'react';
import type { TogglePropsBase } from '@salmon/shared';

/** The DOM half of `TogglePropsBase`: the contract plus a style. */
export interface ToggleProps extends TogglePropsBase {
  style?: CSSProperties;
  className?: string;
}
