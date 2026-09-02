import type { CSSProperties } from 'react';
import type { SectionLabelPropsBase } from '@salmon/shared';

export type { SectionLabelVariant } from '@salmon/shared';

/** The DOM half of `SectionLabelPropsBase`: the contract plus a style. */
export interface SectionLabelProps extends SectionLabelPropsBase {
  style?: CSSProperties;
  className?: string;
}
