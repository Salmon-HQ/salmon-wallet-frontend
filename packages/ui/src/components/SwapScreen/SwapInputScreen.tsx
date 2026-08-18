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
import { colors, semantic, spacing, fontFamily, fontWeight, fontSize, componentSizes } from '@salmon/shared';
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
  color: semantic.status.warning,
  textAlign: 'center',
  marginBottom: spacing.sm,
});

const ErrorText = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  color: semantic.status.danger,
  textAlign: 'center',
  marginBottom: spacing.sm,
});

const DisclaimerText = styled(Typography)({
  fontSize: fontSize.xs,
  color: colors.text.tertiary,
  textAlign: 'center',
  marginTop: spacing.xs,
});

// Layout only. It used to paint its own salmon fill behind the button, from
// when the button was a flat colour and the two were indistinguishable. The
// primary button now paints itself — fill, flesh and bezel — so a second fill
// behind it showed up as a duplicate button peeking out from under the first,
// offset by the wrapper's own border and radius.
const ReviewButtonWrapper = styled('div')({
  minWidth: componentSizes.copyButtonWidth,
});

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
          label={t('swap.you_send')}
          value={inAmount}
          onChangeValue={onInAmountChange}
          token={inToken}
          onTokenPress={onInTokenPress}
          usdValue={inUsdValue}
          availableBalance={inToken?.balance}
          editable={true}
          placeholder={t('swap.enter_amount')}
        />

        {swapError && (
          <ErrorText data-testid="swap-error-text">
            {typeof swapError === 'string' ? t(swapError) : t(swapError.key, swapError.params)}
          </ErrorText>
        )}

        {reviewWarning && (
          <WarningText>
            {typeof reviewWarning === 'string'
              ? t(reviewWarning)
              : t(reviewWarning.key, reviewWarning.params)}
          </WarningText>
        )}

        {/* You Receive */}
        <SwapAmountInput
          testID="swap-to"
          label={t('swap.you_receive')}
          value={outAmount}
          onChangeValue={() => {}}
          token={outToken}
          onTokenPress={onOutTokenPress}
          editable={false}
          placeholder="0"
          isLoading={isLoadingQuote}
        />

        <DisclaimerText>{t('swap.platform_fee_disclaimer')}</DisclaimerText>
      </InputsContainer>

      {/* Review Button */}
      <ButtonContainer>
        <ReviewButtonWrapper>
          <PrimaryButton
            onClick={onReview}
            disabled={!canReview}
            testID="swap-review-button"
            style={{
              minWidth: componentSizes.copyButtonWidth,
              height: componentSizes.buttonHeightCompact,
            }}
          >
            {t('swap.review.reviewAndSwap')}
          </PrimaryButton>
        </ReviewButtonWrapper>
      </ButtonContainer>
    </Container>
  );
}
