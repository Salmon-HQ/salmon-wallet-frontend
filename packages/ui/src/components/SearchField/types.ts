import type { CSSProperties } from 'react';
import type { SearchFieldPropsBase } from '@salmon/shared';

/** The DOM half of `SearchFieldPropsBase`: the cross-platform contract plus a style. */
export interface SearchFieldProps extends SearchFieldPropsBase {
  style?: CSSProperties;
  className?: string;
}
