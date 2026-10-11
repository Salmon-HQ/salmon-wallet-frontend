import type { CSSProperties } from 'react';
import type { StatGridPropsBase, StatTilePropsBase } from '@salmon/shared';

/** The DOM half of `StatTilePropsBase`. */
export interface StatTileProps extends StatTilePropsBase {
  style?: CSSProperties;
}

/** The DOM half of `StatGridPropsBase`. */
export interface StatGridProps extends StatGridPropsBase {
  style?: CSSProperties;
}
