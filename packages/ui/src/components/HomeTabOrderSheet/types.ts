import type { CSSProperties } from 'react';
import type { HomeTabOrderSheetPropsBase } from '@salmon/shared';

/** The DOM half of `HomeTabOrderSheetPropsBase`: the contract plus a style. */
export interface HomeTabOrderSheetProps extends HomeTabOrderSheetPropsBase {
  style?: CSSProperties;
  className?: string;
}
