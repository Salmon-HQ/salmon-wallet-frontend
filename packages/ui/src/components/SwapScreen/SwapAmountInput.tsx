/**
 * SwapAmountInput - Input field for swap amounts with token selector
 *
 * Web version using MUI and @emotion/styled for browser extension
 */
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import {
  borderRadius,
  colors,
  componentSizes,
  fontFamily,
  fontWeight,
  formatTokenBalance,
  spacing,
  useCurrencyContext,
  fontSize,
  shadowsCSS,
  letterSpacing,
  lineHeight,
  opacity,
  duration,
  easing,
  sanitizeDecimalInput,
} from '@salmon/shared';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import { BlurContainer } from '../BlurContainer';
import type { SwapAmountInputProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const QUICK_FILL_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: 'MAX', value: 1 },
] as const;

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
});

const Label = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  letterSpacing: letterSpacing.normal,
  lineHeight: `${fontSize.base * lineHeight.condensed}px`,
});

const InputContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: componentSizes.inputHeightLg,
  padding: `0 ${spacing.md}px`,
});

const LoadingContainer = styled(Box)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
});

const StyledInput = styled(InputBase)({
  flex: 1,
  fontSize: fontSize.md,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  height: '100%',
  '& .MuiInputBase-input': {
    padding: 0,
    height: '100%',
  },
  '& .MuiInputBase-input::placeholder': {
    color: colors.text.tertiary,
    opacity: opacity.full,
  },
  '&.Mui-disabled .MuiInputBase-input': {
    color: colors.text.primary,
    WebkitTextFillColor: colors.text.primary,
  },
});

const TokenDropdown = styled(ButtonBase)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.button.secondaryBackground,
  borderRadius: borderRadius.sm + 2,
  padding: `${spacing.xxs}px ${spacing.sm}px`,
  gap: spacing.sm - 1,
  height: componentSizes.iconSizeXL,
  minWidth: componentSizes.swapSelectorMinWidth,
  boxShadow: shadowsCSS.sm,
  cursor: 'pointer',
  transition: `opacity ${duration.normal} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.high,
  },
});

const TokenIcon = styled('img')({
  width: componentSizes.iconSizeCompact,
  height: componentSizes.iconSizeCompact,
  borderRadius: borderRadius.lg,
  objectFit: 'cover',
});

const TokenIconPlaceholder = styled(Box)({
  width: componentSizes.iconSizeCompact,
  height: componentSizes.iconSizeCompact,
  borderRadius: borderRadius.lg,
  backgroundColor: colors.skeleton.base,
});

const TokenSymbol = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  opacity: opacity.soft,
  letterSpacing: letterSpacing.normal,
  lineHeight: `${fontSize.base * lineHeight.condensed}px`,
});

const InfoRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
});

const InfoSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.xxs,
});

const UsdValue = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  letterSpacing: letterSpacing.normal,
  lineHeight: `${fontSize.sm * lineHeight.normal}px`,
});

const AvailableBalance = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.light,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  letterSpacing: letterSpacing.normal,
  lineHeight: `${fontSize.sm * lineHeight.normal}px`,
});

const AvailableBalanceAligned = styled(AvailableBalance)({
  alignSelf: 'flex-end',
});

const QuickFillButtons = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  gap: spacing.xs,
});

const QuickFillButton = styled(ButtonBase)({
  backgroundColor: colors.button.secondaryBackground,
  borderRadius: borderRadius.sm,
  padding: `${spacing.xs}px ${spacing.base}px`,
  transition: `opacity ${duration.fast} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.medium,
  },
});

const QuickFillText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  textTransform: 'uppercase',
});

// ============================================================================
// SwapAmountInput Component
// ============================================================================

/**
 * SwapAmountInput - Input field for swap amounts with token selector
 */
export function SwapAmountInput({
  label,
  value,
  onChangeValue,
  token,
  onTokenPress,
  usdValue,
  availableBalance,
  editable = true,
  placeholder,
  style,
  isLoading = false,
  testID,
}: SwapAmountInputProps): React.ReactElement {
  const { t } = useTranslation();
  const [{ currency }, { formatPrecise }] = useCurrencyContext();
  const showQuickFill = editable && availableBalance !== undefined && !!token;

  const handleChangeText = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChangeValue(sanitizeDecimalInput(event.target.value));
    },
    [onChangeValue]
  );

  const handleQuickFill = useCallback(
    (percentage: number) => {
      if (availableBalance === undefined || !token) return;

      const fillAmount = availableBalance * percentage;
      const decimals = token.decimals ?? 9;
      const truncated = Math.floor(fillAmount * 10 ** decimals) / 10 ** decimals;
      onChangeValue(truncated > 0 ? truncated.toString() : '0');
    },
    [availableBalance, token, onChangeValue]
  );

  return (
    <Container style={style}>
      {/* Label */}
      <Label>{label}</Label>

      {/* Input Row */}
      <BlurContainer
        borderColor={value ? colors.accent.primary : undefined}
        style={{ borderRadius: borderRadius.md }}
      >
      <InputContainer>
        {isLoading ? (
          <LoadingContainer>
            <CircularProgress size={20} sx={{ color: colors.text.secondary }} />
          </LoadingContainer>
        ) : (
          <StyledInput
            value={value}
            onChange={handleChangeText}
            placeholder={placeholder ?? t('swap.enter_amount')}
            disabled={!editable}
            inputProps={{
              inputMode: 'decimal',
              pattern: '[0-9.]*',
              'data-testid': testID ? `${testID}-amount` : undefined,
            }}
          />
        )}

        {/* Token Dropdown */}
        <TokenDropdown onClick={onTokenPress} aria-label={`Select token: ${token?.symbol || 'Select'}`} data-testid={testID ? `${testID}-token` : undefined}>
          {token?.logo ? (
            <TokenIcon
              src={token.logo}
              alt={token.symbol}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <TokenIconPlaceholder />
          )}
          <TokenSymbol>{token?.symbol || 'Select'}</TokenSymbol>
        </TokenDropdown>
      </InputContainer>
      </BlurContainer>

      {/* USD Value and Balance Row */}
      {(usdValue !== undefined || availableBalance !== undefined) && (
        <InfoSection>
          <InfoRow>
            <UsdValue>{formatPrecise(usdValue !== undefined ? Math.floor(usdValue * 100) / 100 : undefined)} {currency.toUpperCase()}</UsdValue>
            {showQuickFill ? (
              <QuickFillButtons>
                {QUICK_FILL_OPTIONS.map((option) => (
                  <QuickFillButton
                    key={option.label}
                    onClick={() => handleQuickFill(option.value)}
                    data-testid={testID ? `${testID}-quickfill-${option.label}` : undefined}
                  >
                    <QuickFillText>{option.value === 1 ? t('general.max') : option.label}</QuickFillText>
                  </QuickFillButton>
                ))}
              </QuickFillButtons>
            ) : availableBalance !== undefined && token ? (
              <AvailableBalance>
                {t('swap.available_balance', {
                  balance: formatTokenBalance(availableBalance),
                  symbol: token.symbol,
                })}
              </AvailableBalance>
            ) : null}
          </InfoRow>
          {showQuickFill && availableBalance !== undefined && token && (
            <AvailableBalanceAligned>
              {t('swap.available_balance', {
                balance: formatTokenBalance(availableBalance),
                symbol: token.symbol,
              })}
            </AvailableBalanceAligned>
          )}
        </InfoSection>
      )}
    </Container>
  );
}
