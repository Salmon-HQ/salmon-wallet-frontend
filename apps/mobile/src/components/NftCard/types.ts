import type { StyleProp, ViewStyle } from 'react-native';
import type { NftCardPropsBase, NftCardSkeletonPropsBase } from '@salmon/shared';

// Import NFT types from shared package
export type {
  NftBlockchain,
  NftAttribute,
  NftDataBase,
  NftData,
  NftDataSimple,
  SolanaNftData,
  BitcoinNftData,
} from '@salmon/shared';

/** The mobile half of `NftCardPropsBase`: the contract plus a style. */
export interface NftCardProps extends NftCardPropsBase {
  /** Optional custom styles for the container */
  style?: StyleProp<ViewStyle>;
}

/** The mobile half of `NftCardSkeletonPropsBase`: the contract plus a style. */
export interface NftCardSkeletonProps extends NftCardSkeletonPropsBase {
  /** Optional custom styles for the container */
  style?: StyleProp<ViewStyle>;
}
