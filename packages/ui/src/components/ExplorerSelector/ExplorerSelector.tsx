/**
 * ExplorerSelector — the block explorer panel, on the DOM. The mobile twin
 * is `apps/mobile/src/components/SettingsSelectors/ExplorerSelector`.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type ExplorerSelectorItem } from '@salmon/shared';

import { SettingsPanelContent } from '../SettingsPanelContent';
import { SettingsSelectorList } from '../SettingsSelectorList';
import type { ExplorerSelectorProps } from './types';

export function ExplorerSelector({
  explorers,
  activeExplorerName,
  onSelectExplorer,
  onBack,
  loading,
}: ExplorerSelectorProps): React.ReactElement {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (item: ExplorerSelectorItem) => onSelectExplorer(item.key),
    [onSelectExplorer]
  );

  return (
    <SettingsPanelContent
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
    </SettingsPanelContent>
  );
}
