import type { BlockchainType } from '@salmon/shared';

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
  /** Callback fired when the scanner is closed */
  onClose: () => void;
  /** Optional title displayed in the scanner header */
  title?: string;
  /** Optional custom styles for the container */
  containerStyle?: object;
}
