import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import { spacing, componentSizes } from '@salmon/shared';
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

// Layout only — see the note on ReviewButtonWrapper in SwapInputScreen. This
// one painted a gradient the button was then made transparent to reveal; the
// button owns its own fill now.
const ConfirmButtonGradient = styled('div')({
  flex: 1,
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
  isRefreshing = false,
  confirmLabel,
  style,
}: SwapReviewButtonsProps) {
  const { t } = useTranslation();
  // A quote in flight owns the confirm button too: it says so while it works,
  // and stops accepting a second press on top of the first.
  const isBusy = isConfirming || isRefreshing;
  return (
    <ButtonsContainer style={style}>
      <BackButtonWrapper>
        <SecondaryButton
          onClick={onBack}
          disabled={isBusy}
          testID="swap-back-button"
          // Height is the only legal override: the compact row is shorter than
          // a screen's committing action. Radius, fill and border belong to the
          // button, not to the screen — a local salmon outline at a different
          // radius made this pair read as two unrelated controls.
          style={{ height: componentSizes.buttonHeightCompact }}
        >
          {t('general.back')}
        </SecondaryButton>
      </BackButtonWrapper>
      <ConfirmButtonGradient>
        <PrimaryButton
          onClick={onConfirm}
          loading={isBusy}
          disabled={isBusy}
          testID="swap-confirm-button"
          style={{
            height: componentSizes.buttonHeightCompact,
            whiteSpace: 'nowrap',
          }}
        >
          {confirmLabel ?? t('general.confirm')}
        </PrimaryButton>
      </ConfirmButtonGradient>
    </ButtonsContainer>
  );
}
