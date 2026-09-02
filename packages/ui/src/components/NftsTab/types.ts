import type { CSSProperties, UIEvent } from 'react';
import type { NftData, Testable } from '@salmon/shared';

/**
 * Props for the NFTs sub-tab, on the DOM.
 *
 * The tab owns the only scrolling region inside Home's content region;
 * everything above it — the wallet header, the balance and the sub-tab row —
 * is the Home shell's, laid out in flow and fixed. There is no cross-platform
 * contract for this shape: mobile's half carries RN scroll props and this one
 * carries a DOM scroll handler, and nothing is shared but the idea.
 */
export interface NftsTabProps extends Testable {
  /** Opens the collectible. Omit and the tiles are inert. */
  onNftPress?: (nft: NftData) => void;
  /** Asks the backend to include blacklisted / spam-scored collectibles. */
  includeSpam?: boolean;
  /** Lets the host fade its seam in off the same scroll offset. */
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  /** The Home shell owns the screen gutter, so the tab draws none of its own. */
  contentStyle?: CSSProperties;
  style?: CSSProperties;
  className?: string;
}
