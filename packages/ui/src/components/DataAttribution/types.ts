import type { CSSProperties } from 'react';
import type { DataAttributionPropsBase } from '@salmon/shared';

/** The DOM half of `DataAttributionPropsBase`: the contract plus a style. */
export interface DataAttributionProps extends DataAttributionPropsBase<CSSProperties> {}
