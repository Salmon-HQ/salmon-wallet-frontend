import type { ViewStyle } from 'react-native';
import type { BlockchainAccount, PreparedNftTransactionResponse } from '@salmon/shared';
import type { NftData } from '../NftCard/types';

// Re-export for convenience
export type { NftAttribute, NftData } from '../NftCard/types';

/**
 * NFT detail data is the full NftData type
 * The detail sheet can display all blockchain-specific fields
 */
export type NftDetailData = NftData;

/**
 * Props for the NftDetailSheet component
 * Bottom sheet modal for displaying NFT details
 */
export interface NftDetailSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Callback when the sheet is closed */
  onClose: () => void;
  /** NFT data to display */
  nft: NftDetailData | null;
  /** Account used for NFT transfer actions */
  account?: BlockchainAccount;
  /** Callback fired after a successful send flow is acknowledged */
  onSendSuccess?: (txId: string) => void;
  /** Prepared burn transaction flow metadata */
  burnPreview?: PreparedNftTransactionResponse | null;
  /** Whether the burn preview is being prepared or the burn is being submitted */
  burnPreparing?: boolean;
  /** True while post-burn settlement waits for the indexer (gates the success CTA) */
  burnSettling?: boolean;
  /** Successful burn transaction ID */
  burnSuccessTxId?: string | null;
  /** Optional burn preview error */
  burnError?: string | null;
  /** Callback when Burn button is pressed */
  onBurnPress?: () => void;
  /** Callback when burn is confirmed from the review step */
  onBurnConfirm?: () => void;
  /** Callback fired after a successful burn flow is acknowledged */
  onBurnSuccess?: (txId: string) => void;
  /** Callback when burn review state should be reset */
  onBurnReset?: () => void;
  /** Optional custom styles for the container */
  style?: ViewStyle;
}
