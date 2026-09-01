/**
 * AccountNamePanel - edit account name screen for mobile.
 *
 * A `Card` field (same shell `RecipientInput` wears — the field is a card
 * that happens to hold a `TextInput`, not a hand-drawn box), an error line,
 * a disclaimer, and the save button.
 */

import React, { useState, useCallback } from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { borderWidth, fontFamilyNative, fontSize, type Semantic } from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { Card } from '../../Card';
import { PrimaryButton } from '../../Button';
import { useSemantic, useThemedStyles } from '../../../theme/useThemedStyles';
import type { AccountNamePanelProps } from './types';

export function AccountNamePanel({
  currentName,
  onSave,
  onBack,
}: AccountNamePanelProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('settings.wallets.edit_name_empty'));
      return;
    }
    setError('');
    onSave(trimmed);
  }, [name, onSave, t]);

  const handleChangeText = useCallback(
    (text: string) => {
      setName(text);
      if (error) setError('');
    },
    [error]
  );

  return (
    <SettingsScreenLayout title={t('settings.account_edit.name_section')} onBack={onBack}>
      <Card
        padding="lg"
        style={error ? styles.fieldError : undefined}
        accessibilityLabel={t('settings.account_edit.name_section')}
      >
        <TextInput
          testID="account-name-input"
          style={styles.input}
          value={name}
          onChangeText={handleChangeText}
          placeholder={t('settings.account_add.set_name_placeholder')}
          placeholderTextColor={text.tertiary}
          autoFocus
          maxLength={32}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
      </Card>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.disclaimer}>{t('settings.wallets.edit_name_disclaimer')}</Text>

      <PrimaryButton testID="account-name-save-button" onPress={handleSave}>
        {t('actions.save')}
      </PrimaryButton>
    </SettingsScreenLayout>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    fieldError: {
      borderColor: t.status.danger,
      borderWidth: borderWidth.thin,
    },
    input: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.regular,
      fontSize: fontSize.bodyLg,
      padding: 0,
    },
    errorText: {
      color: t.status.danger,
      fontFamily: fontFamilyNative.regular,
      fontSize: fontSize.caption,
    },
    disclaimer: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: fontSize.caption,
    },
  });
