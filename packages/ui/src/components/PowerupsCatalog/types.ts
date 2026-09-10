import type { CSSProperties } from 'react';
import type { PowerupsCatalogPropsBase } from '@salmon/shared';

/** The DOM half of `PowerupsCatalogPropsBase`: the contract plus a style. */
export interface PowerupsCatalogProps extends PowerupsCatalogPropsBase {
  style?: CSSProperties;
}
