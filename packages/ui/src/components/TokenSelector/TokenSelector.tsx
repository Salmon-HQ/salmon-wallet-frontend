/**
 * TokenSelector Component
 *
 * Combines an input field for amount entry with a token selector button.
 * Opens a modal with search and pagination for token selection.
 *
 * Web version using MUI and @emotion/styled for browser extension.
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import ButtonBase from '@mui/material/ButtonBase';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  fontFamily,
  fontWeight,
  getShortAddress,
  fontSize,
  opacity,
  componentSizes,
  duration,
  easing,
} from '@salmon/shared';

import { TokenSelectorModal } from './TokenSelectorModal';
import type { TokenSelectorToken, TokenSelectorProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.background.primary,
  borderRadius: borderRadius.xl,
  padding: spacing.sm,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
});

const InputContainer = styled(Box)({
  flex: 1,
  marginRight: spacing.sm,
});

const AmountInput = styled(InputBase)({
  width: '100%',
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  padding: `${spacing.sm}px ${spacing.md}px`,
  '& .MuiInputBase-input::placeholder': {
    color: colors.text.tertiary,
    opacity: opacity.full,
  },
});

const SelectorButton = styled(ButtonBase)<{ disabled?: boolean }>(({ disabled }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.lg,
  padding: `${spacing.sm}px ${spacing.md}px`,
  minWidth: componentSizes.buttonMinWidth,
  transition: `background-color ${duration.normal} ${easing.ease}`,
  opacity: disabled ? 0.5 : 1,
  cursor: disabled ? 'default' : 'pointer',
  '&:hover': {
    backgroundColor: disabled ? colors.background.card : colors.background.tertiary,
  },
}));

const TokenIconImage = styled('img')({
  width: componentSizes.iconSizeLarge,
  height: componentSizes.iconSizeLarge,
  borderRadius: borderRadius.xl,
  backgroundColor: colors.card.border,
  objectFit: 'cover',
  marginRight: spacing.sm,
});

const TokenIconPlaceholder = styled(Box)({
  width: componentSizes.iconSizeLarge,
  height: componentSizes.iconSizeLarge,
  borderRadius: borderRadius.xl,
  backgroundColor: colors.card.border,
  marginRight: spacing.sm,
});

const TokenTextContainer = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const TokenName = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const TokenAddress = styled(Typography)({
  fontSize: fontSize.xs,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  marginTop: spacing.xxs,
});

const ChevronContainer = styled(Box)({
  marginLeft: spacing.xs,
  display: 'flex',
  alignItems: 'center',
});

const StyledChevron = styled(ChevronRightIcon)({
  color: colors.text.secondary,
  fontSize: fontSize.lg,
});

// ============================================================================
// TokenSelector Component
// ============================================================================

/**
 * TokenSelector component for selecting tokens and entering amounts.
 *
 * Combines an input field for amount entry with a token selector button.
 * Opens a modal with search and pagination for token selection.
 *
 * @example
 * ```tsx
 * <TokenSelector
 *   value={amount}
 *   onChangeValue={setAmount}
 *   tokens={userTokens}
 *   featuredTokens={[solToken, usdcToken]}
 *   selectedToken={selectedToken}
 *   onTokenSelect={handleTokenSelect}
 *   onSearch={searchTokens}
 *   placeholder="0.00"
 * />
 * ```
 */
export function TokenSelector({
  value,
  onChangeValue,
  tokens,
  featuredTokens,
  onTokenSelect,
  selectedToken,
  onSearch,
  placeholder = '0.00',
  hiddenBalance = false,
  showNetworkChip = false,
  showVerifiedDisclaimer = false,
  disabled = false,
}: TokenSelectorProps): React.ReactElement {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpenModal = useCallback(() => {
    if (!disabled) {
      setModalVisible(true);
    }
  }, [disabled]);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleTokenSelect = useCallback(
    (token: TokenSelectorToken) => {
      onTokenSelect(token);
      setModalVisible(false);
    },
    [onTokenSelect]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const text = event.target.value;
      // Allow only valid numeric input
      const sanitized = text.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitized.split('.');
      const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
      onChangeValue(formatted);
    },
    [onChangeValue]
  );

  const tokenName =
    selectedToken?.name || selectedToken?.symbol || t('wallet.select_token', 'Select');
  const tokenSymbol = selectedToken?.symbol;
  const tokenLogo = selectedToken?.logo;
  const tokenAddress = selectedToken?.mint || selectedToken?.address;

  return (
    <Container>
      <InputContainer>
        <AmountInput
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          inputProps={{
            inputMode: 'decimal',
            pattern: '[0-9.]*',
          }}
        />
      </InputContainer>

      <SelectorButton
        onClick={handleOpenModal}
        disabled={disabled}
        aria-label={t('accessibility.select_token', 'Select {{name}}', { name: tokenName })}
      >
        {tokenLogo ? (
          <TokenIconImage
            src={tokenLogo}
            alt={tokenName}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <TokenIconPlaceholder />
        )}
        <TokenTextContainer>
          <TokenName>{tokenName}</TokenName>
          {tokenSymbol && tokenAddress && (
            <TokenAddress>{getShortAddress(tokenAddress, 4)}</TokenAddress>
          )}
        </TokenTextContainer>
        <ChevronContainer>
          <StyledChevron />
        </ChevronContainer>
      </SelectorButton>

      <TokenSelectorModal
        visible={modalVisible}
        onClose={handleCloseModal}
        tokens={tokens}
        featuredTokens={featuredTokens}
        onSelect={handleTokenSelect}
        onSearch={onSearch}
        hiddenBalance={hiddenBalance}
        showNetworkChip={showNetworkChip}
        showVerifiedDisclaimer={showVerifiedDisclaimer}
      />
    </Container>
  );
}
