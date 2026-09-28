import type { CSSProperties } from 'react';
import type { PowerupsFabPropsBase } from '@salmon/shared';

/** The DOM half of `PowerupsFabPropsBase`: the contract plus a style. */
export interface PowerupsFabProps extends PowerupsFabPropsBase {
  style?: CSSProperties;
}
