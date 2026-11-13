import type { BlockchainType, TransactionRequestLink, TransferRequest } from '@salmon/shared';

/**
 * Data returned when a QR code is scanned and validated for the active chain
 */
export interface QRScanResult {
  /** The raw decoded payload from the QR code */
  data: string;
  /** The validated destination address extracted from the payload */
  address: string;
  /** Amount carried by a payment URI, when present */
  amount?: string;
  /** The Solana Pay transfer request the code carried, when it asked for more than an address */
  request?: TransferRequest;
  /**
   * A Solana Pay transaction request (spec 043): the merchant builds the
   * payment, so there is no address to fill and `address` is empty. Only a
   * scanner opened with `acceptTransactionRequests` hands one over.
   */
  transactionRequest?: TransactionRequestLink;
}

/**
 * Props for the QRScanner component
 */
export interface QRScannerProps {
  /** Controls visibility of the scanner modal */
  visible: boolean;
  /** Active chain the scanned payload is validated against */
  blockchain: BlockchainType;
  /** Callback fired when a QR code is scanned and validated */
  onScan: (result: QRScanResult) => void;
  /** Send's scanner takes merchant links; any other scanner says to open them from Send. */
  acceptTransactionRequests?: boolean;
  /** Callback fired when the scanner is closed */
  onClose: () => void;
  /** Optional title displayed in the scanner header */
  title?: string;
  /** Optional custom styles for the container */
  containerStyle?: object;
}
