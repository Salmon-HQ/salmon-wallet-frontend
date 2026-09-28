/**
 * TokenLogo — a token's mark: its image when it has one, its symbol's first
 * letters in a well when it does not. Both twins take these; each adds its
 * own style type.
 */
export interface TokenLogoPropsBase {
  uri?: string;
  symbol?: string;
  /** The mark's box, in points. */
  size: number;
  borderRadius?: number;
}
