/**
 * The Memo Powerup's screen contract — both twins extend it
 * (`apps/mobile/src/components/MemoScreen`, `packages/ui/src/components/MemoPage`).
 */
export interface MemoScreenPropsBase<TStyle> {
  publicKey: string | null;
  networkId: string | null;
  /** Called once the memo is written and core's receipt has been dismissed. */
  onNavigateHome?: () => void;
  style?: TStyle;
}
