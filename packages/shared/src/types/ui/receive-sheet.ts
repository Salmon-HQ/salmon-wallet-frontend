import type { BlockchainType } from '../blockchain';

/**
 * Props for the ReceiveSheet component (base - platform-agnostic)
 */
export interface ReceiveSheetPropsBase<TStyle> {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Callback when the sheet should close */
  onClose: () => void;
  /** The wallet address to display and encode in QR code */
  address: string;
  /**
   * The chain the displayed address belongs to. Required: a deposit made on
   * the wrong network is unrecoverable, so the sheet must always be able to
   * name the chain it is asking the user to be paid on.
   */
  blockchain: BlockchainType;
  /**
   * Callback when the copy button is pressed.
   * Return/resolve `true` when the copy succeeded so the sheet can show
   * its copied feedback; `false` (or a rejection) suppresses it.
   */
  onCopy?: () => boolean | Promise<boolean>;
  /**
   * The environment the address lives on ("Devnet", "Testnet", "Sepolia"), or
   * undefined on mainnet. A deposit sent to a test-network address is not real
   * money, so the sheet says which environment it is asking to be paid on
   * (spec 026 D6).
   */
  networkLabel?: string;
  /** Additional styles */
  style?: TStyle;
}
