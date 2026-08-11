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
   * Callback when the copy button is pressed.
   * Return/resolve `true` when the copy succeeded so the sheet can show
   * its copied feedback; `false` (or a rejection) suppresses it.
   */
  onCopy?: () => boolean | Promise<boolean>;
  /** Additional styles */
  style?: TStyle;
}
