/**
 * AddressAddPanel - Add new contact to address book (mobile)
 *
 * Each field is a `Card` (the shell `RecipientInput` and `AccountNamePanel`
 * both wear) — the placeholder carries the label, so the form has no heading
 * of its own above a control.
 */

import React, { useCallback, useState } from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  fontFamilyNative,
  fontSize,
  useAccountsContext,
  useAddressBookForm,
  useAddressValidation,
  type AddressBookAddBaseProps,
  type BlockchainType,
  type Semantic,
} from '@salmon/shared';
import { Card } from '../../Card';
import { PrimaryButton } from '../../Button';
import { QRScanner } from '../../QRScanner';
import type { QRScanResult } from '../../QRScanner';
import { RecipientInput } from '../../Send';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { useSemantic, useThemedStyles } from '../../../theme/useThemedStyles';

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
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();
  const [accountState] = useAccountsContext();
  const form = useAddressBookForm({ networkId: activeNetworkId });
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
    await onSave(form.buildInput());
  }, [form, onSave]);

  return (
    <SettingsScreenLayout
      title={t('settings.addressbook.add', 'Add Address')}
      subtitle={t('settings.addressbook.add_subtitle', 'Save a label and address for later.')}
      onBack={onBack}
    >
      <Card padding="lg" accessibilityLabel={t('settings.addressbook.label', 'Label')}>
        <TextInput
          testID="address-book-label-input"
          style={styles.input}
          value={form.label}
          onChangeText={form.setLabel}
          placeholder={t('settings.addressbook.label', 'Label')}
          placeholderTextColor={text.tertiary}
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
        placeholder={t('general.name_or_address', {
          token: activeBlockchain,
          defaultValue: 'Enter address or domain',
        })}
        validationState={validationState}
        isValidating={isValidating}
      />

      <Card padding="md" accessibilityLabel={t('settings.addressbook.network')}>
        <Text style={styles.networkText}>
          {activeBlockchain.charAt(0).toUpperCase() + activeBlockchain.slice(1)}
        </Text>
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

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    input: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.regular,
      fontSize: fontSize.bodyLg,
      padding: 0,
    },
    networkText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: fontSize.bodyLg,
    },
  });
