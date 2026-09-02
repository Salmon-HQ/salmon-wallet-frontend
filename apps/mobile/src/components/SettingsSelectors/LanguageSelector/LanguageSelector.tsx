/**
 * LanguageSelector - Language selection component for mobile
 *
 * Displays a list of supported languages and allows the user
 * to select their preferred display language.
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { type LanguageSelectorItem } from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { SettingsSelectorList } from '../SettingsSelectorList';
import type { LanguageSelectorProps } from './types';

// ============================================================================
// Component
// ============================================================================

export function LanguageSelector({
  languages,
  activeLanguageCode,
  onSelectLanguage,
  onBack,
}: LanguageSelectorProps) {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (lang: LanguageSelectorItem) => onSelectLanguage(lang.code),
    [onSelectLanguage]
  );

  return (
    <SettingsScreenLayout
      title={t('settings.languages.title', 'Language')}
      subtitle={t('settings.languages.subtitle', "Choose the app's display language.")}
      onBack={onBack}
    >
      <SettingsSelectorList
        items={languages}
        getKey={(lang) => lang.code}
        isSelected={(lang) => activeLanguageCode === lang.code}
        onSelect={handleSelect}
        getPrimaryText={(lang) => lang.nativeName}
        getSecondaryText={(lang) => lang.code.toUpperCase()}
        testIdPrefix="language-option"
      />
    </SettingsScreenLayout>
  );
}

export default LanguageSelector;
