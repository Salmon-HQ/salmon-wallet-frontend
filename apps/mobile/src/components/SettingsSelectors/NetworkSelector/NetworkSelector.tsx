/**
 * NetworkSelector - Network selection component for mobile
 *
 * Displays a list of available blockchain networks and allows the user
 * to switch between them. Networks are filtered by the developer mode
 * toggle (only mainnets when off, all networks when on).
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { type NetworkSelectorBaseProps, type NetworkSelectorItem } from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { SettingsSelectorList } from '../SettingsSelectorList';

// ============================================================================
// Component
// ============================================================================

export function NetworkSelector({
  networks,
  activeNetworkId,
  onSelectNetwork,
  onBack,
  loading,
}: NetworkSelectorBaseProps) {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (network: NetworkSelectorItem) => onSelectNetwork(network.id),
    [onSelectNetwork]
  );

  return (
    <SettingsScreenLayout
      title={t('settings.change_network', 'Network')}
      subtitle={t('settings.change_network_subtitle', 'Switch the network your wallet uses.')}
      onBack={onBack}
    >
      <SettingsSelectorList
        items={networks}
        getKey={(network) => network.id}
        isSelected={(network) => activeNetworkId === network.id}
        onSelect={handleSelect}
        getPrimaryText={(network) => network.name}
        getSecondaryText={(network) => network.blockchain}
        loading={loading}
        testIdPrefix="network-option"
      />
    </SettingsScreenLayout>
  );
}

export default NetworkSelector;
