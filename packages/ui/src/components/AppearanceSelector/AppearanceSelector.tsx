/**
 * AppearanceSelector — the theme preference panel, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/SettingsSelectors/AppearanceSelector`:
 * three rows (System, Light, Dark), each led by its glyph — a mode is a
 * picture, not a pair of letters (owner, 2026-09-02) — on the same shared
 * contract (`AppearanceSelectorBaseProps`). The caller owns the preference
 * and its persistence (`useTheme().setPreference`).
 */
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { APPEARANCE_OPTIONS, type AppearancePreference, type IconGlyphProps } from '@salmon/shared';

import { CircleHalfIcon, MoonIcon, SunIcon, iconSize } from '../../icons';
import { IconBubble } from '../IconBubble';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { SettingsSelectorList } from '../SettingsSelectorList';
import type { AppearanceSelectorProps } from './types';

interface AppearanceOption {
  preference: AppearancePreference;
  label: string;
  hint?: string;
  icon: React.ComponentType<IconGlyphProps>;
}

/** The platform's glyph for each shared option name. */
const GLYPHS: Record<'circleHalf' | 'sun' | 'moon', React.ComponentType<IconGlyphProps>> = {
  circleHalf: CircleHalfIcon,
  sun: SunIcon,
  moon: MoonIcon,
};

/** The leading well every option row carries — the same size as mobile's. */
const ROW_BUBBLE_SIZE = 40;

export function AppearanceSelector({
  activePreference,
  onSelectPreference,
  onBack,
}: AppearanceSelectorProps): React.ReactElement {
  const { t } = useTranslation();

  const options: AppearanceOption[] = useMemo(
    () =>
      APPEARANCE_OPTIONS.map((option) => ({
        preference: option.preference,
        icon: GLYPHS[option.glyph],
        label: t(option.labelKey, option.fallback),
        hint:
          option.preference === 'system'
            ? t('settings.appearance_system_hint', 'Follows your device')
            : undefined,
      })),
    [t]
  );

  const handleSelect = useCallback(
    (item: AppearanceOption) => onSelectPreference(item.preference),
    [onSelectPreference]
  );

  return (
    <SettingsPanelContent
      title={t('settings.appearance', 'Appearance')}
      subtitle={t('settings.appearance_subtitle', 'Choose light, dark, or system.')}
      onBack={onBack}
    >
      <SettingsSelectorList
        items={options}
        getKey={(item) => item.preference}
        isSelected={(item) => activePreference === item.preference}
        onSelect={handleSelect}
        getPrimaryText={(item) => item.label}
        getSecondaryText={(item) => item.hint}
        renderLeadingElement={(item) => (
          <IconBubble
            size={ROW_BUBBLE_SIZE}
            shape="rounded"
            tone="surface"
            icon={item.icon}
            iconSize={iconSize.md}
          />
        )}
        testIdPrefix="appearance-option"
      />
    </SettingsPanelContent>
  );
}
