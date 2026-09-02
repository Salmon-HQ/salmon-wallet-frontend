import type { CSSProperties } from 'react';
import type { StateBlockPropsBase } from '@salmon/shared';

export type { StateBlockTone } from '@salmon/shared';

/** The DOM half of `StateBlockPropsBase`: the cross-platform contract plus a style. */
export interface StateBlockProps extends StateBlockPropsBase {
  style?: CSSProperties;
  className?: string;
}
