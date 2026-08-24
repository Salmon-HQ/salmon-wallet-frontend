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
          placeholderTextColor={semantic.text.tertiary}
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
    borderRadius: borderRadius.r2,
    borderWidth: borderWidth.thin,
    borderColor: semantic.border.default,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
  },
  inputError: {
    borderColor: semantic.status.danger,
  },
  errorText: {
    color: semantic.status.danger,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  disclaimer: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
});
