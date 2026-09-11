/**
 * The two-bar glyph behind the Powerup install / uninstall control: a `+`
 * whose vertical bar turns 90° to lie on top of the horizontal one and read
 * as `−`, and the inverse on the way back. One glyph turning in place,
 * instead of swapping two separate Phosphor icons — install and uninstall
 * are the same object, not two objects trading places.
 */
export interface PlusMinusGlyphPropsBase {
  /** True once installed — the bars overlap into a minus. False reads as a plus. */
  minus: boolean;
  /** Defaults to 22, the powerup toggle's icon size. */
  size?: number;
  /** Bar colour. A token value only. */
  color?: string;
}
