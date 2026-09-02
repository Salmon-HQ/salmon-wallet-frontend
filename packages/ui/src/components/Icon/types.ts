import type { CSSProperties } from 'react';
import type { BlockchainMarkPropsBase } from '@salmon/shared';

/** Props of the hand-drawn marks (DOM). */
export interface BlockchainMarkProps extends BlockchainMarkPropsBase {
  className?: string;
  style?: CSSProperties;
}
