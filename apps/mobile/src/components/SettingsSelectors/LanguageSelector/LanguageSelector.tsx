/**
 * LanguageSelector - Language selection component for mobile
 *
 * Displays a list of supported languages and allows the user
 * to select their preferred display language.
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { type LanguageSelectorBaseProps, type LanguageSelectorItem } from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { SettingsSelectorList } from '../SettingsSelectorList';

// ============================================================================
// Component
// ============================================================================

export function LanguageSelector({
  languages,
  activeLanguageCode,
  onSelectLanguage,
  onBack,
}: LanguageSelectorBaseProps) {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (lang: LanguageSelectorItem) => onSelectLanguage(lang.code),
    [onSelectLanguage]
  );

  return (
    <SettingsScreenLayout title={t('settings.languages.title', 'Language')} onBack={onBack}>
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
