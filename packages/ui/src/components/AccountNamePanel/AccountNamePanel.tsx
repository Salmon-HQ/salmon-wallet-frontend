/**
 * AccountNamePanel — edit account name, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AccountPanels/AccountNamePanel`:
 * a `Card` field, an error line, a disclaimer, and the save button, on the
 * same `AccountNamePanelPropsBase` contract — the caller owns the write.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { fontFamily, fontSize, useAccountNameDraft } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton } from '../Button';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { TextInput } from '../TextInput';
import type { AccountNamePanelProps } from './types';

export function AccountNamePanel({
  currentName,
  onSave,
  onBack,
}: AccountNamePanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { text } = useSemantic();
  const { name, error, changeName, save } = useAccountNameDraft({
    currentName,
    onSave,
    emptyMessage: t('settings.wallets.edit_name_empty'),
  });

  return (
    <SettingsPanelContent
      title={t('settings.account_edit.name_section')}
      subtitle={t('settings.account_edit.name_section_subtitle', 'Choose a name for this account.')}
      onBack={onBack}
    >
      <TextInput
        testID="account-name-input"
        value={name}
        onChangeText={changeName}
        placeholder={t('settings.account_add.set_name_placeholder')}
        accessibilityLabel={t('settings.account_edit.name_section')}
        error={error || undefined}
        autoFocus
        maxLength={32}
        onSubmitEditing={save}
      />

      <p
        style={{
          margin: 0,
          color: text.secondary,
          fontFamily: fontFamily.sans,
          fontSize: fontSize.caption,
        }}
      >
        {t('settings.wallets.edit_name_disclaimer')}
      </p>

      <PrimaryButton onPress={save} disabled={!name.trim()} testID="account-name-save-button">
        {t('actions.save')}
      </PrimaryButton>
    </SettingsPanelContent>
  );
}
