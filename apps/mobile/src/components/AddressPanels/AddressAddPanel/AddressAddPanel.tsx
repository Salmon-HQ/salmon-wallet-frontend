/**
 * AddressAddPanel - Add new contact to address book (mobile)
 *
 * The fields are `AddressForm`'s; this panel only names the screen and
 * commits a new contact on the active network.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAddressAddPanel, type BlockchainType } from '@salmon/shared';
import { AddressForm } from '../../AddressForm';
import type { AddressAddPanelProps } from './types';

export function AddressAddPanel({
  activeNetworkId,
  activeNetworkName: _activeNetworkName,
  activeBlockchain,
  onSave,
  onBack,
}: AddressAddPanelProps) {
  const { t } = useTranslation();
  const { form, save } = useAddressAddPanel({ networkId: activeNetworkId, onSave });

  return (
    <AddressForm
      title={t('settings.addressbook.add', 'Add Address')}
      subtitle={t('settings.addressbook.add_subtitle', 'Save a label and address for later.')}
      networkLabel={activeBlockchain.charAt(0).toUpperCase() + activeBlockchain.slice(1)}
      form={form}
      onSave={save}
      onBack={onBack}
      blockchain={activeBlockchain as BlockchainType}
      addressPlaceholder={t('general.name_or_address', {
        token: activeBlockchain,
        defaultValue: 'Enter address or domain',
      })}
    />
  );
}

export default AddressAddPanel;
