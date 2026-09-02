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
 * The tab owns the only scroll view inside Home's content region; everything
 * above that region — the wallet header, the balance and the sub-tab row — is
 * the Home shell's, laid out in flow and fixed.
 */
export interface NftsTabProps {
  /**
   * Merged into the grid's own content container. The Home shell owns the
   * screen gutter for every sub-tab, so the tab does not draw one of its own.
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Lets the host fade its seam in off the same scroll offset. */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
}
