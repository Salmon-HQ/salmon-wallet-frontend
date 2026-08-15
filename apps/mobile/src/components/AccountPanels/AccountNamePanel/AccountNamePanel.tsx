/**
 * AccountNamePanel - Edit account name screen for mobile
 *
 * Provides a TextInput pre-filled with the current name, save button,
 * empty validation error, and a disclaimer text.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  fontSize,
  fontFamilyNative,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { PrimaryButton } from '../../Button';
import type { AccountNamePanelProps } from './types';

// ============================================================================
// Component
// ============================================================================

export function AccountNamePanel({
  currentName,
  onSave,
  onBack,
}: AccountNamePanelProps): React.ReactElement {
  const { t } = useTranslation();
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
      <View style={styles.inputContainer}>
        <TextInput
          testID="account-name-input"
          style={[styles.input, error ? styles.inputError : undefined]}
          value={name}
          onChangeText={handleChangeText}
          placeholder={t('settings.account_add.set_name_placeholder')}
          placeholderTextColor={colors.text.tertiary}
          autoFocus
          maxLength={32}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <Text style={styles.disclaimer}>{t('settings.wallets.edit_name_disclaimer')}</Text>

      <View style={styles.buttonContainer}>
        <PrimaryButton testID="account-name-save-button" onPress={handleSave}>
          {t('actions.save')}
        </PrimaryButton>
      </View>
    </SettingsScreenLayout>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.thin,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.md,
  },
  inputError: {
    borderColor: semantic.status.danger,
  },
  errorText: {
    color: semantic.status.danger,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  disclaimer: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.sm,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
});
