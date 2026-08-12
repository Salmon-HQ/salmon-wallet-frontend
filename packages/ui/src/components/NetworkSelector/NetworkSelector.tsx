import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type NetworkSelectorItem } from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { SettingsSelectorList } from '../SettingsSelectorList';
import type { NetworkSelectorProps } from './types';

export function NetworkSelector({
  networks,
  activeNetworkId,
  onSelectNetwork,
  onBack,
  loading,
}: NetworkSelectorProps): React.ReactElement {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (item: NetworkSelectorItem) => onSelectNetwork(item.id),
    [onSelectNetwork]
  );

  return (
    <SettingsPanelContent title={t('settings.change_network', 'Network')} onBack={onBack}>
      <SettingsSelectorList
        items={networks}
        getKey={(item) => item.id}
        isSelected={(item) => activeNetworkId === item.id}
        onSelect={handleSelect}
        getPrimaryText={(item) => item.name}
        getSecondaryText={(item) => item.blockchain}
        secondaryTypographyProps={{ textTransform: 'capitalize' }}
        loading={loading}
        testIdPrefix="network-option"
      />
    </SettingsPanelContent>
  );
}
