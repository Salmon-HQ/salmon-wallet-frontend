import type { CSSProperties } from 'react';
import type { UnderlineTabsPropsBase } from '@salmon/shared';

export type { UnderlineTab, UnderlineTabsSize } from '@salmon/shared';

/** The DOM half of `UnderlineTabsPropsBase`: the cross-platform contract plus a style. */
export interface UnderlineTabsProps extends UnderlineTabsPropsBase {
  style?: CSSProperties;
  className?: string;
}
