import type { Testable } from './testable';

/**
 * The `+` that opens the Powerups catalogue over Home. It floats in the same
 * corner on both platforms; the plus turns an eighth of a turn into the close
 * mark while the catalogue is up, so one glyph carries both states.
 */
export interface PowerupsFabPropsBase extends Testable {
  onPress: () => void;
  /** True while the catalogue is open — the plus turns 45 degrees. */
  open?: boolean;
}
