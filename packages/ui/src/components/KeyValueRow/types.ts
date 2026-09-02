import type { CSSProperties } from 'react';
import type { KeyValueRowPropsBase } from '@salmon/shared';

export type { KeyValueTone } from '@salmon/shared';

/** The DOM half of `KeyValueRowPropsBase`: the contract plus a style. */
export interface KeyValueRowProps extends KeyValueRowPropsBase {
  style?: CSSProperties;
  className?: string;
}
