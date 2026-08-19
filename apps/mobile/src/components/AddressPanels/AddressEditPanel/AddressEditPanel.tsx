/**
 * AddressEditPanel - Edit an existing contact in the address book (mobile)
 */

import React, { useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  colors,
  spacing,
  borderRadius,
  fontFamilyNative,
  useAddressBookForm,
  type AddressBookEditBaseProps,
  fontSize,
  opacity,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { InputAddress } from '../../InputAddress';

// ============================================================================
// Component
// ============================================================================

export function AddressEditPanel({
  contact,
  activeBlockchain: _activeBlockchain,
  onSave,
  onBack,
}: AddressBookEditBaseProps) {
  const { t } = useTranslation();
  const form = useAddressBookForm({
    label: contact.name,
    address: contact.domain || contact.address,
    networkId: contact.networkId,
    resolvedAddress: contact.address,
    isDomain: !!contact.domain,
  });

  const handleSave = useCallback(async () => {
    if (!form.canSave) return;
    await onSave(contact.address, form.buildInput());
  }, [form, onSave, contact.address]);

  return (
    <SettingsScreenLayout title={t('settings.addressbook.edit', 'Edit Address')} onBack={onBack}>
      {/* Label */}
      <Text style={styles.fieldLabel}>{t('settings.addressbook.label', 'Label')}</Text>
      <TextInput
        testID="address-book-label-input"
        style={styles.textInput}
        value={form.label}
        onChangeText={form.setLabel}
        placeholder={t('settings.addressbook.label', 'Label')}
        placeholderTextColor={semantic.text.tertiary}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {/* Address */}
      <View style={styles.addressSection}>
        <InputAddress
          address={form.address}
          onChange={form.setAddress}
          onValidation={form.handleValidation}
          label={t('general.address', 'Address')}
          testID="address-book-address"
        />
      </View>

      {/* Network (read-only) */}
      <Text style={styles.fieldLabel}>{t('settings.addressbook.network')}</Text>
      <View style={styles.networkDisplay}>
        <Text style={styles.networkText}>
          {contact.networkId.split('-')[0].charAt(0).toUpperCase() +
            contact.networkId.split('-')[0].slice(1)}
        </Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        testID="address-book-save-button"
        accessibilityRole="button"
        style={[styles.saveButton, !form.canSave && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!form.canSave}
        activeOpacity={0.7}
      >
        <Text style={styles.saveButtonText}>{t('settings.addressbook.save', 'Save Address')}</Text>
      </TouchableOpacity>
    </SettingsScreenLayout>
  );
}

export default AddressEditPanel;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  fieldLabel: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.body,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  textInput: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.r2,
    padding: spacing.md,
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
  },
  addressSection: {
    marginTop: spacing.lg,
  },
  networkDisplay: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.r2,
    padding: spacing.md,
  },
  networkText: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
  },
  saveButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  saveButtonDisabled: {
    opacity: opacity.faint,
  },
  saveButtonText: {
    color: semantic.accent.onFill,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
  },
});
