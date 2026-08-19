import React, { useCallback } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  borderRadius,
  type CurrencySelectorItem,
  fontSize,
  fontWeight,
  componentSizes,
} from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { SettingsSelectorList } from '../SettingsSelectorList';
import type { CurrencySelectorProps } from './types';

// ============================================================================
// Styled Components (currency-specific leading element)
// ============================================================================

const CurrencySymbol = styled(Box)({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: borderRadius.md,
  backgroundColor: colors.background.card,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: spacing.md,
});

const SymbolText = styled(Typography)({
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
});

// ============================================================================
// Component
// ============================================================================

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

  return (
    <SettingsPanelContent title={t('settings.currency', 'Display Currency')} onBack={onBack}>
      <SettingsSelectorList
        items={currencies}
        getKey={(item) => item.code}
        isSelected={(item) => activeCurrencyCode === item.code}
        onSelect={handleSelect}
        getPrimaryText={(item) => item.name}
        getSecondaryText={(item) => item.code.toUpperCase()}
        renderLeadingElement={(item) => (
          <CurrencySymbol>
            <SymbolText>{item.symbol}</SymbolText>
          </CurrencySymbol>
        )}
        testIdPrefix="currency-option"
      />
    </SettingsPanelContent>
  );
}
