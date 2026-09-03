/**
 * AddressEditPanel - Edit an existing contact in the address book (mobile)
 *
 * `AddressForm`'s fields, seeded from the contact; saving commits against the
 * contact's original address.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAddressEditPanel, type BlockchainType } from '@salmon/shared';
import { AddressForm } from '../../AddressForm';
import type { AddressEditPanelProps } from './types';

export function AddressEditPanel({
  contact,
  activeBlockchain: _activeBlockchain,
  onSave,
  onBack,
}: AddressEditPanelProps) {
  const { t } = useTranslation();
  const { form, save } = useAddressEditPanel({ contact, onSave });

  const chain = contact.networkId.split('-')[0];
  const networkLabel = chain.charAt(0).toUpperCase() + chain.slice(1);

  return (
    <AddressForm
      title={t('settings.addressbook.edit', 'Edit Address')}
      subtitle={t('settings.addressbook.edit_subtitle', "Update this contact's label or address.")}
      networkLabel={networkLabel}
      form={form}
      onSave={save}
      onBack={onBack}
      blockchain={chain as BlockchainType}
      addressPlaceholder={t('send.enter_address_or_domain')}
    />
  );
}

export default AddressEditPanel;
