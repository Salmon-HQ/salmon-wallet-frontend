import type { NftData } from '../../utils/nft';
import type { Testable } from './testable';

/**
 * The collectible tile: a `Card` at the control radius, the artwork edge to
 * edge inside it, the name over the collection line on a scrim band at the
 * bottom. Press feedback is the card's own.
 */
export interface NftCardPropsBase extends Testable {
  nft: NftData;
  /** Omit and the tile is inert. */
  onPress?: () => void;
}

/** The tile's own geometry while the grid loads. */
export interface NftCardSkeletonPropsBase extends Testable {}
