/**
 * CurrencySelector — the display currency panel, on the DOM. The mobile twin
 * is `apps/mobile/src/components/SettingsSelectors/CurrencySelector`.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type CurrencySelectorItem } from '@salmon/shared';

import { IconBubble } from '../IconBubble';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { SettingsSelectorList } from '../SettingsSelectorList';
import type { CurrencySelectorProps } from './types';

/** The leading well every option row carries — Settings' own row bubble size. */
const ROW_BUBBLE_SIZE = 40;

export function CurrencySelector({
  currencies,
  activeCurrencyCode,
  onSelectCurrency,
  onBack,
}: CurrencySelectorProps): React.ReactElement {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (item: CurrencySelectorItem) => onSelectCurrency(item.code),
    [onSelectCurrency]
  );

  const renderSymbol = useCallback(
    (item: CurrencySelectorItem) => (
      <IconBubble size={ROW_BUBBLE_SIZE} tone="surface">
        {item.symbol}
      </IconBubble>
    ),
    []
  );

  return (
    <SettingsPanelContent
      title={t('settings.currency', 'Display Currency')}
      subtitle={t('settings.currency_subtitle', 'Choose the currency balances show in.')}
      onBack={onBack}
    >
      <SettingsSelectorList
        items={currencies}
        getKey={(item) => item.code}
        isSelected={(item) => activeCurrencyCode === item.code}
        onSelect={handleSelect}
        getPrimaryText={(item) => item.name}
        getSecondaryText={(item) => item.code.toUpperCase()}
        renderLeadingElement={renderSymbol}
        testIdPrefix="currency-option"
      />
    </SettingsPanelContent>
  );
}
