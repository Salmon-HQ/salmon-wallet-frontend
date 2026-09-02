/**
 * The chain marks — Solana, Bitcoin, Ethereum — are brand assets, not
 * interface icons: no icon set carries them, and a mark redrawn to match a UI
 * set stops being the mark. Each platform draws the same paths; this is what
 * a caller may ask of them.
 */
export interface BlockchainMarkPropsBase {
  /** Box size in px. */
  size?: number;
  /** Ink. Defaults to the mode's secondary text. */
  color?: string;
}
