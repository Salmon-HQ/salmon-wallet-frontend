import type { AccountAddPanelPropsBase } from '@salmon/shared';
import type { PanelWait } from '../SettingsPanelStack/types';

/**
 * DOM props for the add-account panel.
 *
 * The two extras are the settings drawer's own contract (`PanelContentProps`),
 * not part of the cross-platform base: the wait this flow shows has to be
 * hosted outside the drawer to survive it, and the flow ends by closing
 * settings rather than by returning to it.
 */
export interface AccountAddPanelProps extends AccountAddPanelPropsBase {
  /** Raise (`wait`) or lower (`null`) the wait the panel stack hosts. */
  onWait: (wait: PanelWait | null) => void;
  /** Close the settings surface entirely. */
  onCloseSettings: () => void;
}
