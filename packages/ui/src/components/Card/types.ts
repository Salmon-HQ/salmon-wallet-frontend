import type { CSSProperties } from 'react';
import type { CardPropsBase } from '@salmon/shared';

export type { CardPadding, CardRadius, CardTone } from '@salmon/shared';

/** The DOM half of `CardPropsBase`: the cross-platform contract plus a style. */
export interface CardProps extends CardPropsBase {
  /** Layout the parent owns — margins, width, the flex direction of a row. */
  style?: CSSProperties;
  className?: string;
}
