/**
 * AddressEditPanel — edit a contact, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AddressPanels/AddressEditPanel`.
 * `AddressForm`'s fields, seeded from the contact; saving commits against the
 * contact's original address.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getNetworkName, useAddressEditPanel } from '@salmon/shared';

import { AddressForm } from '../AddressForm';
import type { AddressEditPanelProps } from './types';

export function AddressEditPanel({
  contact,
  activeBlockchain: _activeBlockchain,
  onSave,
  onBack,
  errorText,
}: AddressEditPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { form, save } = useAddressEditPanel({ contact, onSave });

  return (
    <AddressForm
      title={t('settings.addressbook.edit', 'Edit Address')}
      subtitle={t('settings.addressbook.edit_subtitle', "Update this contact's label or address.")}
      networkLabel={getNetworkName(contact.networkId)}
      form={form}
      onSave={save}
      onBack={onBack}
      errorText={errorText}
    />
  );
}
