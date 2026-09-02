import type { CSSProperties } from 'react';
import type { TokenListItemPropsBase, TokenListPropsBase } from '@salmon/shared';

export type { TokenListBlockchain as BlockchainType } from '@salmon/shared';

/** The DOM half of `TokenListItemPropsBase`: the contract plus a style. */
export interface TokenListItemProps extends TokenListItemPropsBase {
  style?: CSSProperties;
  className?: string;
}

/** The DOM half of `TokenListPropsBase`: the contract plus a style. */
export interface TokenListProps extends TokenListPropsBase {
  /** Maximum height for the list (enables scrolling) */
  maxHeight?: number | string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Props for the TokenListSkeleton component
 */
export interface TokenListSkeletonProps {
  /** Number of skeleton items to show */
  count?: number;
}
