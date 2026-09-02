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

// The pair stacks, it does not share a line. Side by side each label had half
// a narrow surface to live in, and the second action is the longest string
// this screen can show — it is not always "Confirm": an expired quote turns it
// into "Refresh Quote" / "Refresh Estimate", and the Spanish of those runs
// edge to edge inside a half-width button. Full width fits every state's copy
// without wrapping or clipping.
//
// The order is the app's, not this screen's: OnboardingLayout's ratified band
// order is assist / secondary / action with the full-width primary bottom-most,
// so Back sits above Confirm here too and the committing action lands where the
// pointer and the thumb already expect it.
//
// `align-items: stretch` is what makes each button full width, so the two
// layout-only wrappers that used to split the row are gone with the row. The
// second of them painted a gradient the button was then made transparent to
// reveal; the button owns its own fill now.
const ButtonsContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: spacing.md,
  paddingBottom: spacing['2xl'],
});

// ============================================================================
// SwapReviewButtons Component
// ============================================================================

/**
 * SwapReviewButtons - Shared Back/Confirm buttons for review screens
 * Used by SwapReviewScreen
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
  // and stops accepting a second press on top of the first. A confirm in
  // flight is different — the review leaves at the tap and the wave wait takes
  // over (see SwapScreen, and DESIGN.md §The wait) — so the button never spins
  // for it; it only stops accepting a second press.
  const isBusy = isConfirming || isRefreshing;
  return (
    <ButtonsContainer style={style}>
      <SecondaryButton
        onPress={onBack}
        disabled={isBusy}
        testID="swap-back-button"
        // Height is the only legal override: the compact pair is shorter than
        // a screen's committing action. It is fixed on both buttons, so the
        // stack's height is the same in every state and nothing above it moves
        // when the confirm label changes. Radius, fill and border belong to the
        // button, not to the screen — a local salmon outline at a different
        // radius made this pair read as two unrelated controls.
        style={{ height: componentSizes.buttonHeightCompact, width: '100%' }}
      >
        {t('general.back')}
      </SecondaryButton>
      <PrimaryButton
        onPress={onConfirm}
        loading={isRefreshing}
        disabled={isBusy}
        testID="swap-confirm-button"
        style={{
          height: componentSizes.buttonHeightCompact,
          width: '100%',
          whiteSpace: 'nowrap',
        }}
      >
        {confirmLabel ?? t('general.confirm')}
      </PrimaryButton>
    </ButtonsContainer>
  );
}
