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

/** One row of the appearance panel: the option with its platform glyph and translated texts. */
export interface AppearanceRow<Glyph> {
  preference: AppearancePreference;
  label: string;
  /** Only "System" explains itself: it follows the device. */
  hint?: string;
  icon: Glyph;
}

/** The appearance panel's rows, with each glyph name resolved to the platform's icon. */
export function appearanceRows<Glyph>(
  glyphs: Record<AppearanceOption['glyph'], Glyph>,
  t: (key: string, fallback: string) => string
): AppearanceRow<Glyph>[] {
  return APPEARANCE_OPTIONS.map((option) => ({
    preference: option.preference,
    icon: glyphs[option.glyph],
    label: t(option.labelKey, option.fallback),
    hint:
      option.preference === 'system'
        ? t('settings.appearance_system_hint', 'Follows your device')
        : undefined,
  }));
}
