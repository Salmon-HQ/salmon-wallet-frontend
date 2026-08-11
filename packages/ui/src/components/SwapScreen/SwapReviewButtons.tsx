import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import { colors, spacing, borderRadius, gradients, shadowsCSS, componentSizes, borderWidth } from '@salmon/shared';
import { PrimaryButton, SecondaryButton } from '../Button';
import type { SwapReviewButtonsProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const ButtonsContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  gap: spacing.md,
  paddingBottom: spacing['2xl'],
});

const BackButtonWrapper = styled('div')({
  flex: 1,
});

const ConfirmButtonGradient = styled('div')({
  flex: 1,
  borderRadius: borderRadius.lg,
  border: `${borderWidth.accent}px solid ${colors.accent.border}`,
  boxShadow: shadowsCSS.button,
  background: gradients.primaryCSS,
});

// ============================================================================
// SwapReviewButtons Component
// ============================================================================

/**
 * SwapReviewButtons - Shared Back/Confirm buttons for review screens
 * Used by SwapReviewScreen and BridgeReviewScreen
 */
export function SwapReviewButtons({
  onBack,
  onConfirm,
  isConfirming = false,
  confirmLabel,
  style,
}: SwapReviewButtonsProps) {
  const { t } = useTranslation();
  return (
    <ButtonsContainer style={style}>
      <BackButtonWrapper>
        <SecondaryButton
          onClick={onBack}
          disabled={isConfirming}
          testID="swap-back-button"
          style={{
            height: componentSizes.buttonHeightCompact,
            border: `${borderWidth.accent}px solid ${colors.accent.border}`,
            borderRadius: borderRadius.lg,
            backgroundColor: colors.button.cancelBackground,
          }}
        >
          {t('general.back')}
        </SecondaryButton>
      </BackButtonWrapper>
      <ConfirmButtonGradient>
        <PrimaryButton
          onClick={onConfirm}
          loading={isConfirming}
          disabled={isConfirming}
          testID="swap-confirm-button"
          style={{
            height: componentSizes.buttonHeightCompact,
            background: 'transparent',
            whiteSpace: 'nowrap',
          }}
        >
          {confirmLabel ?? t('general.confirm')}
        </PrimaryButton>
      </ConfirmButtonGradient>
    </ButtonsContainer>
  );
}
