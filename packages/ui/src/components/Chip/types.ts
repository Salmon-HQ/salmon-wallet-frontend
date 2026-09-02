import type { CSSProperties } from 'react';
import type { ChipGroupPropsBase, ChipPropsBase } from '@salmon/shared';

export type { ChipOption, ChipSize, ChipVariant } from '@salmon/shared';

/** The DOM half of `ChipPropsBase`: the cross-platform contract plus a style. */
export interface ChipProps extends ChipPropsBase {
  style?: CSSProperties;
  className?: string;
}

/** The DOM half of `ChipGroupPropsBase`: the cross-platform contract plus a style. */
export interface ChipGroupProps extends ChipGroupPropsBase {
  style?: CSSProperties;
  className?: string;
}
