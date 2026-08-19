/**
 * AddressAddPanel - Add new contact to address book (mobile)
 */

import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { QrCodeIcon, iconSize } from '../../../icons';

import {
  colors,
  spacing,
  borderRadius,
  fontFamilyNative,
  useAddressBookForm,
  type AddressBookAddBaseProps,
  type BlockchainType,
  fontSize,
  opacity,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { InputAddress } from '../../InputAddress';
import { QRScanner } from '../../QRScanner';
import type { QRScanResult } from '../../QRScanner';

// ============================================================================
// Component
// ============================================================================

export function AddressAddPanel({
  activeNetworkId,
  activeNetworkName: _activeNetworkName,
  activeBlockchain,
  onSave,
  onBack,
}: AddressBookAddBaseProps) {
  const { t } = useTranslation();
  const form = useAddressBookForm({ networkId: activeNetworkId });
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = useCallback(
    (result: QRScanResult) => {
      form.setAddress(result.address);
      setShowScanner(false);
    },
    [form]
  );

  const handleSave = useCallback(async () => {
    if (!form.canSave) return;
    await onSave(form.buildInput());
  }, [form, onSave]);

  return (
    <SettingsScreenLayout title={t('settings.addressbook.add', 'Add Address')} onBack={onBack}>
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
          placeholder={t('general.name_or_address', {
            token: activeBlockchain,
            defaultValue: 'Enter address or domain',
          })}
          testID="address-book-address"
        />
        <TouchableOpacity
          testID="address-book-scan-button"
          accessibilityRole="button"
          accessibilityLabel={t('qrScanner.scanButton', 'Scan QR code')}
          style={styles.scanButton}
          onPress={() => setShowScanner(true)}
          activeOpacity={0.7}
        >
          <QrCodeIcon size={iconSize.sm} color={semantic.accent.ink} />
          <Text style={styles.scanButtonText}>{t('qrScanner.scanButton', 'Scan QR code')}</Text>
        </TouchableOpacity>
      </View>

      {/* Network (read-only) */}
      <Text style={styles.fieldLabel}>{t('settings.addressbook.network')}</Text>
      <View style={styles.networkDisplay}>
        <Text style={styles.networkText}>
          {activeBlockchain.charAt(0).toUpperCase() + activeBlockchain.slice(1)}
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

      <QRScanner
        visible={showScanner}
        blockchain={activeBlockchain as BlockchainType}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />
    </SettingsScreenLayout>
  );
}

export default AddressAddPanel;

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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  scanButtonText: {
    color: semantic.accent.ink,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.body,
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
