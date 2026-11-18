/**
 * AppearanceSelector - Theme preference selection component for mobile
 *
 * Displays the three appearance choices (System, Light, Dark) and lets the
 * user pick which one drives the active mode.
 */

import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { appearanceRows, type AppearanceRow } from '@salmon/shared';
import { CircleHalfIcon, MoonIcon, SunIcon, iconSize } from '../../icons';
import { IconBubble, type IconGlyphProps } from '../IconBubble';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { SettingsSelectorList } from '../SettingsSelectorList';
import type { AppearanceSelectorProps } from './types';

// ============================================================================
// Component
// ============================================================================

type AppearanceOption = AppearanceRow<React.ComponentType<IconGlyphProps>>;

/** The platform's glyph for each shared option name. */
const GLYPHS: Record<'circleHalf' | 'sun' | 'moon', React.ComponentType<IconGlyphProps>> = {
  circleHalf: CircleHalfIcon,
  sun: SunIcon,
  moon: MoonIcon,
};

/** The leading well every option row carries. */
const ROW_BUBBLE_SIZE = 40;

export function AppearanceSelector({
  activePreference,
  onSelectPreference,
  onBack,
}: AppearanceSelectorProps) {
  const { t } = useTranslation();

  const options = useMemo(() => appearanceRows(GLYPHS, t), [t]);

  const handleSelect = useCallback(
    (item: AppearanceOption) => onSelectPreference(item.preference),
    [onSelectPreference]
  );

  return (
    <SettingsScreenLayout
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
    </SettingsScreenLayout>
  );
}
