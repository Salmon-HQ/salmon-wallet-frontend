import type { QRCodePropsBase } from '@salmon/shared';
import type { ViewStyle } from 'react-native';

/**
 * Props for the QRCode component (React Native)
 * No style prop in the mobile version
 */
export interface QRCodeProps extends QRCodePropsBase<ViewStyle> {
  /**
   * Error correction level. Raise to 'H' when an overlay (e.g. a brand mark)
   * covers part of the code, so the hidden modules stay recoverable.
   */
  ecLevel?: 'L' | 'M' | 'Q' | 'H';
}
