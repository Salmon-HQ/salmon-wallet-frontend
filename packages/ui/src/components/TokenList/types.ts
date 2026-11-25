import type { CSSProperties } from 'react';
import type {
  TokenListFoldRowPropsBase,
  TokenListItemPropsBase,
  TokenListPropsBase,
} from '@salmon/shared';

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

/** The fold row draws no platform style of its own: the contract is all of it. */
export type TokenListFoldRowProps = TokenListFoldRowPropsBase;

/**
 * Props for the TokenListSkeleton component
 */
export interface TokenListSkeletonProps {
  /** Number of skeleton items to show */
  count?: number;
}
