/**
 * The Swap Powerup's screen contract — both twins extend it
 * (`apps/mobile/src/components/SwapScreen`, `packages/ui/src/components/SwapPage`).
 */
export interface SwapScreenPropsBase<TStyle> {
  /** The active account's address on `networkId`, resolved by Home. */
  publicKey: string;
  networkId: string | null;
  /** Called once the swap is signed and core's receipt has been dismissed. */
  onNavigateHome?: () => void;
  style?: TStyle;
}
