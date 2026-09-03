import type { CSSProperties } from 'react';
import type { NftCardPropsBase, NftCardSkeletonPropsBase } from '@salmon/shared';

// Import NFT types from shared package (same as mobile does)
export type {
  NftBlockchain,
  NftAttribute,
  NftDataBase,
  NftData,
  NftDataSimple,
  SolanaNftData,
  BitcoinNftData,
} from '@salmon/shared';

/** The DOM half of `NftCardPropsBase`: the contract plus a style. */
export interface NftCardProps extends NftCardPropsBase {
  style?: CSSProperties;
  className?: string;
}

/** The DOM half of `NftCardSkeletonPropsBase`: the contract plus a style. */
export interface NftCardSkeletonProps extends NftCardSkeletonPropsBase {
  style?: CSSProperties;
  className?: string;
}
