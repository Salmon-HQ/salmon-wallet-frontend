/**
 * CurrencySelector - Display currency selection component for mobile
 *
 * Displays a list of supported currencies and allows the user
 * to select their preferred display currency.
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { type CurrencySelectorBaseProps, type CurrencySelectorItem } from '@salmon/shared';
import { IconBubble } from '../../IconBubble';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { SettingsSelectorList } from '../SettingsSelectorList';

// ============================================================================
// Component
// ============================================================================

export function CurrencySelector({
  currencies,
  activeCurrencyCode,
  onSelectCurrency,
  onBack,
}: CurrencySelectorBaseProps) {
  const { t } = useTranslation();

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
    <SettingsScreenLayout title={t('settings.currency', 'Display Currency')} onBack={onBack}>
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
    </SettingsScreenLayout>
  );
}

export default CurrencySelector;
