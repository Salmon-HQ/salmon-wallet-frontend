import type { Testable } from './testable';

/**
 * Toggle — the on/off control the kit draws once: a settings row's switch,
 * a Powerup's install/uninstall control, anywhere a boolean flips on tap.
 * Promoted from the ad hoc switches `SettingsPanelStack` (DOM) and
 * `SecurityPanel` (mobile) already drew inline — same look, one contract.
 */
export interface TogglePropsBase extends Testable {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  /** What flipping it does, for assistive tech, when the label alone does not say. */
  accessibilityHint?: string;
  disabled?: boolean;
}
