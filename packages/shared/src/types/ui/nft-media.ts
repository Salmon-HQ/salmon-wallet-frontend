import type { Testable } from './testable';

/**
 * An NFT's image, square, at the control radius. A missing image, or one that
 * fails to load, is drawn as the primary fill so the screen never shows an
 * empty hole — the detail, the send review and the burn review share it.
 */
export interface NftMediaPropsBase extends Testable {
  /** The image URL; absent draws the fallback. */
  image?: string | null;
}
