import type { CSSProperties } from 'react';
import type { NftData, NftBlockchain } from '@salmon/shared';

export interface NftCarouselSectionProps {
  title: string;
  blockchain: NftBlockchain;
  nfts: NftData[];
  loading?: boolean;
  /**
   * Render the chain header (icon + title + count). Callers pass `false` when
   * only one chain is on screen, where the label distinguishes nothing.
   * Defaults to `true`.
   */
  showChainLabel?: boolean;
  onNftPress?: (nft: NftData) => void;
  onSeeAllPress?: () => void;
  style?: CSSProperties;
  className?: string;
}

export interface NftCarouselSectionSkeletonProps {
  count?: number;
  style?: CSSProperties;
  className?: string;
}
