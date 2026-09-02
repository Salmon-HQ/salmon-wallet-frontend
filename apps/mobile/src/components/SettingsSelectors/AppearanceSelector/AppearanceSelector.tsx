/**
 * AppearanceSelector - Theme preference selection component for mobile
 *
 * Displays the three appearance choices (System, Light, Dark) and lets the
 * user pick which one drives the active mode.
 */

import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { type AppearancePreference } from '@salmon/shared';
import { CircleHalfIcon, MoonIcon, SunIcon, iconSize } from '../../../icons';
import { IconBubble, type IconGlyphProps } from '../../IconBubble';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { SettingsSelectorList } from '../SettingsSelectorList';
import type { AppearanceSelectorProps } from './types';

// ============================================================================
// Component
// ============================================================================

interface AppearanceOption {
  preference: AppearancePreference;
  label: string;
  hint?: string;
  /** The option's glyph — a mode is a picture, not a pair of letters (owner, 2026-09-02). */
  icon: React.ComponentType<IconGlyphProps>;
}

/** The leading well every option row carries. */
const ROW_BUBBLE_SIZE = 40;

export function AppearanceSelector({
  activePreference,
  onSelectPreference,
  onBack,
}: AppearanceSelectorProps) {
  const { t } = useTranslation();

  const options: AppearanceOption[] = useMemo(
    () => [
      {
        preference: 'system',
        icon: CircleHalfIcon,
        label: t('settings.appearance_options.system', 'System'),
        hint: t('settings.appearance_system_hint', 'Follows your device'),
      },
      {
        preference: 'light',
        icon: SunIcon,
        label: t('settings.appearance_options.light', 'Light'),
      },
      { preference: 'dark', icon: MoonIcon, label: t('settings.appearance_options.dark', 'Dark') },
    ],
    [t]
  );

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

export default AppearanceSelector;
