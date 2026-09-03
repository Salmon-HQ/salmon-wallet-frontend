/**
 * ExplorerSelector - Block explorer selection component for mobile
 *
 * Displays a list of available block explorers and allows the user
 * to select their preferred one for the active blockchain.
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { type ExplorerSelectorItem } from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { SettingsSelectorList } from '../SettingsSelectorList';
import type { ExplorerSelectorProps } from './types';

// ============================================================================
// Component
// ============================================================================

export function ExplorerSelector({
  explorers,
  activeExplorerName,
  onSelectExplorer,
  onBack,
  loading,
}: ExplorerSelectorProps) {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (item: ExplorerSelectorItem) => onSelectExplorer(item.key),
    [onSelectExplorer]
  );

  return (
    <SettingsScreenLayout
      title={t('settings.explorer', 'Block Explorer')}
      subtitle={t('settings.explorer_subtitle', 'Pick where transaction links open.')}
      onBack={onBack}
    >
      <SettingsSelectorList
        items={explorers}
        getKey={(item) => item.key}
        isSelected={(item) => activeExplorerName === item.name}
        onSelect={handleSelect}
        getPrimaryText={(item) => item.name}
        loading={loading}
        emptyMessage={t('common.no_explorers', 'No explorers available for this network')}
        testIdPrefix="explorer-option"
      />
    </SettingsScreenLayout>
  );
}

export default ExplorerSelector;
