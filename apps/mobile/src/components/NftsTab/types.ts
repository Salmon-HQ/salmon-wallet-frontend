import type { ReactNode } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import type { Nft } from '@salmon/shared';
import type { NftBlockchain, NftData } from '../NftCard';

/**
 * Extended blockchain key that includes network suffix for devnet/testnet
 */
export type NftSectionKey = 'solana' | 'solana-devnet';

export interface NftSection {
  nfts: NftData[];
  raw: Nft[];
  loading: boolean;
  blockchain: NftBlockchain;
  networkLabel?: string; // e.g., "Devnet", "Sepolia"
  isTestnet: boolean;
}

/**
 * Props for the NFTs sub-tab.
 *
 * The tab owns the only scroll view on the NFTs side of Home, so the Home
 * shell hands it the block that must scroll away with the grid (the balance)
 * instead of stacking a second scroll view above it.
 */
export interface NftsTabProps {
  /** Rendered above everything inside the list header, so it scrolls away. */
  listHeader?: ReactNode;
  /**
   * Merged into the grid's own content container. The Home shell owns the
   * screen gutter for every sub-tab, so the tab does not draw one of its own.
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Lets the host drive a sticky overlay off the same scroll offset. */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
}
