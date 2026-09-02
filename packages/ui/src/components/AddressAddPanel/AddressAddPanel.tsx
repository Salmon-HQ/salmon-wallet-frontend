/**
 * AddressAddPanel — add a contact, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AddressPanels/AddressAddPanel`:
 * each field is a `Card` — the placeholder carries the label, so the form
 * has no heading of its own above a control — then the network card and the
 * save button.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fontFamily, fontSize, spacing, useAddressBookForm } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton } from '../Button';
import { Card } from '../Card';
import { InputAddress } from '../InputAddress';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { TextInput } from '../TextInput';
import { WarningNotice } from '../WarningNotice';
import type { AddressAddPanelProps } from './types';

export function AddressAddPanel({
  activeNetworkId,
  activeNetworkName: _activeNetworkName,
  activeBlockchain,
  onSave,
  onBack,
  errorText,
}: AddressAddPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { text } = useSemantic();
  const form = useAddressBookForm({ networkId: activeNetworkId });

  const handleSave = useCallback(async () => {
    if (!form.canSave) return;
    await onSave(form.buildInput());
  }, [form, onSave]);

  return (
    <SettingsPanelContent
      title={t('settings.addressbook.add', 'Add Address')}
      subtitle={t('settings.addressbook.add_subtitle', 'Save a label and address for later.')}
      onBack={onBack}
    >
      <TextInput
        testID="address-book-label-input"
        value={form.label}
        onChangeText={form.setLabel}
        placeholder={t('settings.addressbook.label', 'Label')}
      />

      <InputAddress
        address={form.address}
        onChange={form.setAddress}
        onValidation={form.handleValidation}
        label={t('general.address', 'Address')}
        testID="address-book-address"
      />

      <Card padding="md" accessibilityLabel={t('settings.addressbook.network')}>
        <span
          style={{
            color: text.secondary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.bodyLg,
          }}
        >
          {activeBlockchain.charAt(0).toUpperCase() + activeBlockchain.slice(1)}
        </span>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <PrimaryButton
          onPress={() => void handleSave()}
          disabled={!form.canSave}
          testID="address-book-save-button"
        >
          {t('settings.addressbook.save', 'Save Address')}
        </PrimaryButton>
        {errorText && (
          <div data-testid="address-book-save-error">
            <WarningNotice tone="error" title={errorText} />
          </div>
        )}
      </div>
    </SettingsPanelContent>
  );
}
