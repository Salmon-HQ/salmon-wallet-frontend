import type { CSSProperties } from 'react';
import type { QRCodePropsBase } from '@salmon/shared';

/**
 * Props for the QRCode component (Web/Extension)
 */
export interface QRCodeProps extends QRCodePropsBase<CSSProperties> {
  /** Additional CSS class */
  className?: string;
  /**
   * Error correction level. Raise to 'H' when an overlay (e.g. a brand mark)
   * covers part of the code, so the hidden modules stay recoverable.
   */
  ecLevel?: 'L' | 'M' | 'Q' | 'H';
}
