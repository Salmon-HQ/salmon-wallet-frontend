/**
 * AddressForm — the address-book form (mobile).
 *
 * The DOM twin is `packages/ui/src/components/AddressForm`. Add and Edit are
 * the same three fields — each a `Card`, the placeholder carrying the label —
 * a network card, the save button and the QR scanner behind the field's scan
 * affordance; the panels differ only in their words and in what saving does.
 */
import React, { useCallback, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  fontFamilyNative,
  fontSize,
  useAccountsContext,
  useAddressValidation,
  type Semantic,
} from '@salmon/shared';
import { Card } from '../Card';
import { TextField } from '../TextInput';
import { PrimaryButton } from '../Button';
import { QRScanner } from '../QRScanner';
import type { QRScanResult } from '../QRScanner';
import { RecipientInput } from '../Send';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AddressFormProps } from './types';

export function AddressForm({
  title,
  subtitle,
  networkLabel,
  form,
  onSave,
  onBack,
  blockchain,
  addressPlaceholder,
  testID,
}: AddressFormProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const [accountState] = useAccountsContext();
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

  return (
    <SettingsScreenLayout title={title} subtitle={subtitle} onBack={onBack} testID={testID}>
      <TextField
        testID="address-book-label-input"
        value={form.label}
        onChangeText={form.setLabel}
        placeholder={t('settings.addressbook.label', 'Label')}
        accessibilityLabel={t('settings.addressbook.label', 'Label')}
      />

      <RecipientInput
        testID="address-book-address"
        value={form.address}
        onChangeText={form.setAddress}
        onScanPress={() => setShowScanner(true)}
        scanLabel={t('qrScanner.scanButton', 'Scan QR code')}
        placeholder={addressPlaceholder}
        validationState={validationState}
        isValidating={isValidating}
      />

      <Card padding="md" accessibilityLabel={t('settings.addressbook.network')}>
        <Text style={styles.networkText}>{networkLabel}</Text>
      </Card>

      <PrimaryButton testID="address-book-save-button" onPress={onSave} disabled={!form.canSave}>
        {t('settings.addressbook.save', 'Save Address')}
      </PrimaryButton>

      <QRScanner
        visible={showScanner}
        blockchain={blockchain}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />
    </SettingsScreenLayout>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    networkText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: fontSize.bodyLg,
    },
  });
