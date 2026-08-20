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
export interface SettingsSheetProps extends SettingsSheetBaseProps {
  /**
   * What each row currently reads, keyed by option id — the language, the
   * currency, the explorer. A settings row that only says its own name makes
   * the user open a screen to learn what they already chose; the answer is
   * the row's own right-hand side. Absent for rows that have no single value
   * to state.
   *
   * Proper nouns and codes only (endonyms, ISO currency codes, explorer
   * names): these ship identical in both languages, so nothing here is a
   * translation the caller has to invent.
   */
  optionValues?: Partial<Record<string, string>>;
}

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
}

/**
 * Settings section configuration
 */
export interface SettingsSection extends SettingsSectionBase {
  /** Options in this section */
  options: SettingsOption[];
}
