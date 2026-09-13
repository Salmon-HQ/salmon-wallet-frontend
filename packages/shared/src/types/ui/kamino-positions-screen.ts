/**
 * The Kamino Positions Powerup's screen contract — both twins extend it
 * (`apps/mobile/src/components/KaminoPositionsScreen`,
 * `packages/ui/src/components/KaminoPositionsPage`).
 */
export interface KaminoPositionsScreenPropsBase<TStyle> {
  publicKey: string | null;
  style?: TStyle;
}
