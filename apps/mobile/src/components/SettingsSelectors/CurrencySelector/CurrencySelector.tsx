/**
 * CurrencySelector - Display currency selection component for mobile
 *
 * Displays a list of supported currencies and allows the user
 * to select their preferred display currency.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  colors,
  componentSizes,
  spacing,
  borderRadius,
  fontFamilyNative,
  type CurrencySelectorBaseProps,
  type CurrencySelectorItem,
  fontSize,
  semantic,
} from '@salmon/shared';
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
      <View style={styles.symbolContainer}>
        <Text style={styles.symbolText}>{item.symbol}</Text>
      </View>
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

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  symbolContainer: {
    width: componentSizes.iconSize2XL,
    height: componentSizes.iconSize2XL,
    borderRadius: borderRadius.r2,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  symbolText: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.heading,
  },
});
