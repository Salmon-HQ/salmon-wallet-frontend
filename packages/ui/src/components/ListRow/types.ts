import type { CSSProperties } from 'react';
import type { ListRowPropsBase } from '@salmon/shared';

export type { ListRowPadding, ListRowEmphasis } from '@salmon/shared';

/** The DOM half of `ListRowPropsBase`: the contract plus a style. */
export interface ListRowProps extends ListRowPropsBase {
  style?: CSSProperties;
  className?: string;
}
