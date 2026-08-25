import type { CSSProperties } from 'react';
import type { PreparedNftTransactionResponse } from '@salmon/shared';
import type { NftData } from '../NftCard/types';

// Re-export for convenience
export type { NftAttribute, NftData } from '../NftCard/types';

/**
 * NFT detail data is the full NftData type (same as ui)
 */
export type NftDetailData = NftData;

/**
 * Props for the NftDetailPage component (Web/Extension)
 * Full-page view for displaying NFT details in browser extension
 */
export interface NftDetailPageProps {
  /** NFT data to display */
  nft: NftDetailData;
  /** Callback to navigate back */
  onBack: () => void;
  /** Callback when Send button is pressed */
  onSendPress?: () => void;
  /** Callback when Burn button is pressed */
  onBurnPress?: () => void;
  /**
   * Hides the actions that move the NFT, for a wallet that cannot sign.
   * Hidden rather than disabled: a watch-only wallet will never be able to
   * send or burn, so a greyed control is a promise the wallet cannot keep.
   */
  actionsUnavailable?: boolean;
  /** Burn flow step shown inside the detail page */
  burnStep?: 'idle' | 'review' | 'success';
  /** Prepared burn transaction flow metadata */
  burnPreview?: PreparedNftTransactionResponse | null;
  /** Whether the burn preview is being prepared or executed */
  burnPreparing?: boolean;
  /** True while post-burn settlement waits for the indexer (gates the success CTA) */
  burnSettling?: boolean;
  /** Optional burn preparation error */
  burnError?: string | null;
  /** Callback when navigating back from the burn review step */
  onBurnBack?: () => void;
  /** Callback when confirming burn from the review step */
  onBurnConfirm?: () => void;
  /** Optional explorer URL for the burn success step */
  burnSuccessExplorerUrl?: string | null;
  /** Callback when dismissing the burn success step */
  onBurnSuccessContinue?: () => void;
  /** Optional custom styles */
  style?: CSSProperties;
  /** Optional CSS class name */
  className?: string;
}
