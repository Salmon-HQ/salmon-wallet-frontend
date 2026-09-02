import type { CSSProperties, UIEvent } from 'react';
import type { NftData, NftsTabPropsBase } from '@salmon/shared';

/**
 * The DOM half of `NftsTabPropsBase`.
 *
 * The tab owns the only scrolling region inside Home's content region;
 * everything above it — the wallet header, the balance and the sub-tab row —
 * is the Home shell's, laid out in flow and fixed. Mobile's half carries RN
 * scroll props and reads the spam setting from its app context; this one
 * carries a DOM scroll handler and takes the setting from the host.
 */
export interface NftsTabProps extends NftsTabPropsBase {
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
