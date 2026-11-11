/**
 * CurrencySelector - Display currency selection component for mobile
 *
 * Displays a list of supported currencies and allows the user
 * to select their preferred display currency.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type CurrencySelectorItem, filterCurrencyItems } from '@salmon/shared';
import { IconBubble } from '../IconBubble';
import { SearchField } from '../SearchField';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { SettingsSelectorList } from '../SettingsSelectorList';
import { StateBlock } from '../StateBlock';
import type { CurrencySelectorProps } from './types';

// ============================================================================
// Component
// ============================================================================

export function CurrencySelector({
  currencies,
  activeCurrencyCode,
  onSelectCurrency,
  onBack,
}: CurrencySelectorProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => filterCurrencyItems(currencies, query), [currencies, query]);

  const handleSelect = useCallback(
    (item: CurrencySelectorItem) => onSelectCurrency(item.code),
    [onSelectCurrency]
  );

  const renderSymbol = useCallback(
    (item: CurrencySelectorItem) => (
      <IconBubble size={40} tone="surface">
        {item.symbol}
      </IconBubble>
    ),
    []
  );

  return (
    <SettingsScreenLayout
      title={t('settings.currency', 'Display Currency')}
      subtitle={t('settings.currency_subtitle', 'Choose the currency balances show in.')}
      onBack={onBack}
    >
      <SearchField
        testID="currency-search-input"
        value={query}
        onChangeText={setQuery}
        placeholder={t('settings.currency_search', 'Search currency')}
      />
      {shown.length === 0 ? (
        <StateBlock
          testID="currency-no-match"
          tone="empty"
          title={t('settings.currency_no_match', 'No currencies match')}
        />
      ) : (
        <SettingsSelectorList
          items={shown}
          getKey={(item) => item.code}
          isSelected={(item) => activeCurrencyCode === item.code}
          onSelect={handleSelect}
          getPrimaryText={(item) => item.name}
          getSecondaryText={(item) => item.code.toUpperCase()}
          renderLeadingElement={renderSymbol}
          testIdPrefix="currency-option"
        />
      )}
    </SettingsScreenLayout>
  );
}

export default CurrencySelector;
