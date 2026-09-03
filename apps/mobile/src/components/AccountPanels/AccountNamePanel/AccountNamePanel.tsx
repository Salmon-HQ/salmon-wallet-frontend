/**
 * AccountNamePanel - edit account name screen for mobile.
 *
 * A `Card` field (same shell `RecipientInput` wears — the field is a card
 * that happens to hold a `TextInput`, not a hand-drawn box), an error line,
 * a disclaimer, and the save button.
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fontFamilyNative, fontSize, useAccountNameDraft, type Semantic } from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { TextField } from '../../TextInput';
import { PrimaryButton } from '../../Button';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { AccountNamePanelProps } from './types';

export function AccountNamePanel({
  currentName,
  onSave,
  onBack,
}: AccountNamePanelProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { name, error, changeName, save } = useAccountNameDraft({
    currentName,
    onSave,
    emptyMessage: t('settings.wallets.edit_name_empty'),
  });

  return (
    <SettingsScreenLayout
      title={t('settings.account_edit.name_section')}
      subtitle={t('settings.account_edit.name_section_subtitle', 'Choose a name for this account.')}
      onBack={onBack}
    >
      <TextField
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

      <Text style={styles.disclaimer}>{t('settings.wallets.edit_name_disclaimer')}</Text>

      <PrimaryButton testID="account-name-save-button" onPress={save}>
        {t('actions.save')}
      </PrimaryButton>
    </SettingsScreenLayout>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    disclaimer: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: fontSize.caption,
    },
  });
