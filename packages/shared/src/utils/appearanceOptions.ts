/**
 * The three appearance choices, in the order the Settings row lists them, on
 * both platforms. The glyph is a name; each platform maps it to its icon.
 */
import type { AppearancePreference } from '../types/settings';

export interface AppearanceOption {
  preference: AppearancePreference;
  glyph: 'circleHalf' | 'sun' | 'moon';
  labelKey: string;
  /** English fallback for `t(labelKey, fallback)`. */
  fallback: string;
}

export const APPEARANCE_OPTIONS: readonly AppearanceOption[] = [
  {
    preference: 'system',
    glyph: 'circleHalf',
    labelKey: 'settings.appearance_options.system',
    fallback: 'System',
  },
  {
    preference: 'light',
    glyph: 'sun',
    labelKey: 'settings.appearance_options.light',
    fallback: 'Light',
  },
  {
    preference: 'dark',
    glyph: 'moon',
    labelKey: 'settings.appearance_options.dark',
    fallback: 'Dark',
  },
];
