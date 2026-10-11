/**
 * The SKR Powerup's screen contract (spec 039) — both twins extend it
 * (`apps/mobile/src/components/SkrScreen`, `packages/ui/src/components/SkrPage`).
 * Read-only: no action leaves the screen.
 */
export interface SkrScreenPropsBase<TStyle> {
  publicKey: string;
  style?: TStyle;
}
