/**
 * SettingsSheet Component Types
 *
 * Type definitions for the SettingsSheet component, which renders
 * settings content inside the GateContainer expanded state.
 */

import type { IconComponent } from '../../icons';
import type {
  SettingsSheetBaseProps,
  SettingsOptionBase,
  SettingsSectionBase,
} from '@salmon/shared';

/**
 * Props for the SettingsSheet component (React Native specific)
 */
export interface SettingsSheetProps extends SettingsSheetBaseProps {}

/**
 * Settings option item configuration (React Native specific)
 * Extends base with an icon component from the app icon set
 */
export interface SettingsOption extends SettingsOptionBase {
  /** Icon component from `src/icons` */
  icon: IconComponent;
  /** Whether this is a toggle option (switch) instead of navigation */
  isToggle?: boolean;
  /** Whether this is an action (direct callback) instead of navigation */
  isAction?: boolean;
  /**
   * Translation key for what this row exposes. Present only on the rows that
   * reveal key material: it both marks the row as caution-weighted and is the
   * hint a screen reader announces, so the weight is never colour alone.
   */
  cautionHintKey?: string;
}

/**
 * Settings section configuration
 */
export interface SettingsSection extends SettingsSectionBase {
  /** Options in this section */
  options: SettingsOption[];
}
