/**
 * Props for the QRCode component (base - platform-agnostic)
 */
export interface QRCodePropsBase<TStyle> {
  /** The value to encode in the QR code (e.g., wallet address, URL) */
  value: string;
  /** The size of the QR code in pixels */
  size: number;
  /**
   * Background color of the QR code. A token value: the receive sheet passes
   * `text.primary`, the code's ground on both platforms.
   */
  backgroundColor?: string;
  /**
   * Foreground color of the QR code (the dots/modules). A token value: the
   * receive sheet passes `depth.abyss`, the module ink on both platforms.
   */
  color?: string;
  /** Additional styles */
  style?: TStyle;
}
