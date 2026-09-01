/**
 * AddressEditPanel - Edit an existing contact in the address book (mobile)
 *
 * Same field shells as `AddressAddPanel`, seeded from the contact being
 * edited.
 */

import React, { useCallback, useState } from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  fontFamilyNative,
  fontSize,
  semantic,
  useAccountsContext,
  useAddressBookForm,
  useAddressValidation,
  type AddressBookEditBaseProps,
  type BlockchainType,
} from '@salmon/shared';
import { Card } from '../../Card';
import { PrimaryButton } from '../../Button';
import { QRScanner } from '../../QRScanner';
import type { QRScanResult } from '../../QRScanner';
import { RecipientInput } from '../../Send';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';

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
  const [accountState] = useAccountsContext();
  const form = useAddressBookForm({
    label: contact.name,
    address: contact.domain || contact.address,
    networkId: contact.networkId,
    resolvedAddress: contact.address,
    isDomain: !!contact.domain,
  });
  const [showScanner, setShowScanner] = useState(false);

  const { validationState, isValidating } = useAddressValidation(
    form.address,
    accountState.activeBlockchainAccount,
    { debounceMs: 500, onValidation: form.handleValidation }
  );

  const handleScan = useCallback(
    (result: QRScanResult) => {
      form.setAddress(result.address);
      setShowScanner(false);
    },
    [form]
  );

  const handleSave = useCallback(async () => {
    if (!form.canSave) return;
    await onSave(contact.address, form.buildInput());
  }, [form, onSave, contact.address]);

  const networkName =
    contact.networkId.split('-')[0].charAt(0).toUpperCase() + contact.networkId.split('-')[0].slice(1);

  return (
    <SettingsScreenLayout title={t('settings.addressbook.edit', 'Edit Address')} onBack={onBack}>
      <Card padding="lg" accessibilityLabel={t('settings.addressbook.label', 'Label')}>
        <TextInput
          testID="address-book-label-input"
          style={styles.input}
          value={form.label}
          onChangeText={form.setLabel}
          placeholder={t('settings.addressbook.label', 'Label')}
          placeholderTextColor={semantic.text.tertiary}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </Card>

      <RecipientInput
        testID="address-book-address"
        value={form.address}
        onChangeText={form.setAddress}
        onScanPress={() => setShowScanner(true)}
        scanLabel={t('qrScanner.scanButton', 'Scan QR code')}
        placeholder={t('send.enter_address_or_domain')}
        validationState={validationState}
        isValidating={isValidating}
      />

      <Card padding="md" accessibilityLabel={t('settings.addressbook.network')}>
        <Text style={styles.networkText}>{networkName}</Text>
      </Card>

      <PrimaryButton
        testID="address-book-save-button"
        onPress={handleSave}
        disabled={!form.canSave}
      >
        {t('settings.addressbook.save', 'Save Address')}
      </PrimaryButton>

      <QRScanner
        visible={showScanner}
        blockchain={contact.networkId.split('-')[0] as BlockchainType}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />
    </SettingsScreenLayout>
  );
}

export default AddressEditPanel;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  input: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
    padding: 0,
  },
  networkText: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
  },
});
