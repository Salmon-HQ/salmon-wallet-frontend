/**
 * SwapInputScreen - First step of swap flow
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Uses CSS gradients instead of expo-linear-gradient.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontWeight,
  fontSize,
  shadowsCSS,
  componentSizes,
  borderWidth,
  duration,
  easing,
} from '@salmon/shared';
import { SwapAmountInput } from './SwapAmountInput';
import { PrimaryButton } from '../Button';
import type { SwapInputScreenProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  padding: `${spacing['3xl'] + spacing['3xl']}px ${spacing.headerPadding}px ${spacing['2xl']}px`,
  position: 'relative',
});

const InputsContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing['2xl'],
});

const ButtonContainer = styled(Box)({
  position: 'absolute',
  bottom: spacing['2xl'],
  left: 0,
  right: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

const WarningText = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  color: colors.status.warning,
  textAlign: 'center',
  marginBottom: spacing.sm,
});

const ErrorText = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  color: colors.status.error,
  textAlign: 'center',
  marginBottom: spacing.sm,
});

const DisclaimerText = styled(Typography)({
  fontSize: fontSize.xs,
  color: colors.text.tertiary,
  textAlign: 'center',
  marginTop: spacing.xs,
});

const ReviewButtonWrapper = styled('div')<{ $canReview: boolean }>(({ $canReview }) => ({
  borderRadius: borderRadius.lg,
  border: `${borderWidth.thick}px solid ${$canReview ? 'transparent' : 'transparent'}`,
  boxShadow: shadowsCSS.button,
  background: $canReview ? colors.button.primaryBackground : colors.button.inactiveBackground,
  minWidth: componentSizes.copyButtonWidth,
  transition: `border-color ${duration.normal} ${easing.ease}`,
  ...($canReview && {
    '&:hover': {
      borderColor: colors.accent.primary,
    },
  }),
}));

// ============================================================================
// SwapInputScreen Component
// ============================================================================

/**
 * SwapInputScreen - First step of swap flow
 * Shows input/output token selectors and amounts
 */
export function SwapInputScreen({
  inToken,
  outToken,
  inAmount,
  outAmount,
  onInAmountChange,
  onInTokenPress,
  onOutTokenPress,
  inUsdValue,
  isLoadingQuote = false,
  canReview,
  reviewWarning,
  swapError,
  onReview,
  style,
}: SwapInputScreenProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Container style={style}>
      {/* Input Fields */}
      <InputsContainer>
        {/* You Send */}
        <SwapAmountInput
          testID="swap-from"
          label="You Send"
          value={inAmount}
          onChangeValue={onInAmountChange}
          token={inToken}
          onTokenPress={onInTokenPress}
          usdValue={inUsdValue}
          availableBalance={inToken?.balance}
          editable={true}
          placeholder="Enter an amount"
        />

        {swapError && <ErrorText data-testid="swap-error-text">{typeof swapError === 'string' ? t(swapError) : t(swapError.key, swapError.params)}</ErrorText>}

        {reviewWarning && <WarningText>{reviewWarning}</WarningText>}

        {/* You Receive */}
        <SwapAmountInput
          testID="swap-to"
          label="You Receive"
          value={outAmount}
          onChangeValue={() => {}}
          token={outToken}
          onTokenPress={onOutTokenPress}
          editable={false}
          placeholder="0"
          isLoading={isLoadingQuote}
        />

        <DisclaimerText>Includes 0.5% platform fee</DisclaimerText>
      </InputsContainer>

      {/* Review Button */}
      <ButtonContainer>
        <ReviewButtonWrapper $canReview={canReview}>
          <PrimaryButton
            onClick={onReview}
            disabled={!canReview}
            testID="swap-review-button"
            style={{
              minWidth: componentSizes.copyButtonWidth,
              height: componentSizes.buttonHeightCompact,
              background: 'transparent',
              color: canReview ? colors.button.primaryText : undefined,
            }}
          >
            Review & Swap
          </PrimaryButton>
        </ReviewButtonWrapper>
      </ButtonContainer>
    </Container>
  );
}

