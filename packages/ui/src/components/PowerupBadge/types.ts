import type { CSSProperties } from 'react';
import type { PowerupBadgePropsBase } from '@salmon/shared';

export type { PowerupBadgeTier as PowerupTier } from '@salmon/shared';

/** The DOM half of `PowerupBadgePropsBase`: the contract plus a style. */
export interface PowerupBadgeProps extends PowerupBadgePropsBase {
  style?: CSSProperties;
}
