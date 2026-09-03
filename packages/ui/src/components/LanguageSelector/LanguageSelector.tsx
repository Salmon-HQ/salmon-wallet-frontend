/**
 * LanguageSelector — the display language panel, on the DOM. The mobile twin
 * is `apps/mobile/src/components/SettingsSelectors/LanguageSelector`.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type LanguageSelectorItem } from '@salmon/shared';

import { SettingsPanelContent } from '../SettingsPanelContent';
import { SettingsSelectorList } from '../SettingsSelectorList';
import type { LanguageSelectorProps } from './types';

export function LanguageSelector({
  languages,
  activeLanguageCode,
  onSelectLanguage,
  onBack,
}: LanguageSelectorProps): React.ReactElement {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (item: LanguageSelectorItem) => onSelectLanguage(item.code),
    [onSelectLanguage]
  );

  return (
    <SettingsPanelContent
      title={t('settings.languages.title', 'Language')}
      subtitle={t('settings.languages.subtitle', "Choose the app's display language.")}
      onBack={onBack}
    >
      <SettingsSelectorList
        items={languages}
        getKey={(item) => item.code}
        isSelected={(item) => activeLanguageCode === item.code}
        onSelect={handleSelect}
        getPrimaryText={(item) => item.nativeName}
        getSecondaryText={(item) => item.code.toUpperCase()}
        testIdPrefix="language-option"
      />
    </SettingsPanelContent>
  );
}
