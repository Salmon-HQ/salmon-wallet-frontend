import type { StyleProp, ViewStyle } from 'react-native';

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

// Re-import for local use
import type { NftData } from '@salmon/shared';

/**
 * Props for the NftCard component
 */
export interface NftCardProps {
  /** NFT data to display */
  nft: NftData;
  /** Callback when the card is pressed */
  onPress?: () => void;
  /** Optional custom styles for the container */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Props for the NftCardSkeleton component
 */
export interface NftCardSkeletonProps {
  /** Optional custom styles for the container */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}
