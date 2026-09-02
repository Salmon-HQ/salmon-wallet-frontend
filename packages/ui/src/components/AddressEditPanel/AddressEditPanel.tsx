/**
 * AddressEditPanel — edit a contact, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AddressPanels/AddressEditPanel`:
 * the same field shells as `AddressAddPanel`, seeded from the contact.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fontFamily, fontSize, getNetworkName, spacing, useAddressBookForm } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton } from '../Button';
import { Card } from '../Card';
import { InputAddress } from '../InputAddress';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { TextInput } from '../TextInput';
import { WarningNotice } from '../WarningNotice';
import type { AddressEditPanelProps } from './types';

export function AddressEditPanel({
  contact,
  activeBlockchain: _activeBlockchain,
  onSave,
  onBack,
  errorText,
}: AddressEditPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { text } = useSemantic();
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
    <SettingsPanelContent
      title={t('settings.addressbook.edit', 'Edit Address')}
      subtitle={t('settings.addressbook.edit_subtitle', "Update this contact's label or address.")}
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
          {getNetworkName(contact.networkId)}
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
