/**
 * AppearanceSelector - Theme preference selection component for mobile
 *
 * Displays the three appearance choices (System, Light, Dark) and lets the
 * user pick which one drives the active mode.
 */

import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { type AppearancePreference, type AppearanceSelectorBaseProps } from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { SettingsSelectorList } from '../SettingsSelectorList';

// ============================================================================
// Component
// ============================================================================

interface AppearanceOption {
  preference: AppearancePreference;
  label: string;
  hint?: string;
}

export function AppearanceSelector({
  activePreference,
  onSelectPreference,
  onBack,
}: AppearanceSelectorBaseProps) {
  const { t } = useTranslation();

  const options: AppearanceOption[] = useMemo(
    () => [
      {
        preference: 'system',
        label: t('settings.appearance_options.system', 'System'),
        hint: t('settings.appearance_system_hint', 'Follows your device'),
      },
      { preference: 'light', label: t('settings.appearance_options.light', 'Light') },
      { preference: 'dark', label: t('settings.appearance_options.dark', 'Dark') },
    ],
    [t]
  );

  const handleSelect = useCallback(
    (item: AppearanceOption) => onSelectPreference(item.preference),
    [onSelectPreference]
  );

  return (
    <SettingsScreenLayout title={t('settings.appearance', 'Appearance')} onBack={onBack}>
      <SettingsSelectorList
        items={options}
        getKey={(item) => item.preference}
        isSelected={(item) => activePreference === item.preference}
        onSelect={handleSelect}
        getPrimaryText={(item) => item.label}
        getSecondaryText={(item) => item.hint}
        testIdPrefix="appearance-option"
      />
    </SettingsScreenLayout>
  );
}

export default AppearanceSelector;
