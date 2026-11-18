import type { CSSProperties } from 'react';
import type { PillPropsBase } from '@salmon/shared';

/** The DOM half of `PillPropsBase`. */
export interface PillProps extends PillPropsBase {
  style?: CSSProperties;
}
