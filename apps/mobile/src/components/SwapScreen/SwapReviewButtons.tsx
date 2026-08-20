import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { spacing, vs, componentSizes } from '@salmon/shared';
import { PrimaryButton, SecondaryButton } from '../Button';

export interface SwapReviewButtonsProps {
  onBack: () => void;
  onConfirm: () => void;
  isConfirming?: boolean;
  /** Whether a fresh quote/estimate is in flight (see SwapReviewScreenProps) */
  isRefreshing?: boolean;
  confirmLabel?: string;
  style?: object;
}

/**
 * SwapReviewButtons - Shared Back/Confirm buttons for review screens
 * Used by SwapReviewScreen and BridgeReviewScreen
 */
export const SwapReviewButtons: React.FC<SwapReviewButtonsProps> = ({
  onBack,
  onConfirm,
  isConfirming = false,
  isRefreshing = false,
  confirmLabel,
  style,
}) => {
  const { t } = useTranslation();
  // A quote in flight owns the confirm button too: it says so while it works,
  // and stops accepting a second press on top of the first. A confirm in
  // flight is different — the review sinks at the tap and the wave wait takes
  // over (see SwapScreen), so the button never spins for it; it only stops
  // accepting a second press while the sink plays out.
  const isBusy = isConfirming || isRefreshing;
  return (
    <View style={[styles.buttonsContainer, style]}>
      <SecondaryButton
        onPress={onBack}
        disabled={isBusy}
        style={styles.backButton}
        testID="swap-back-button"
      >
        {t('general.back')}
      </SecondaryButton>
      <PrimaryButton
        onPress={onConfirm}
        loading={isRefreshing}
        disabled={isBusy}
        style={styles.confirmButton}
        testID="swap-confirm-button"
      >
        {confirmLabel ?? t('general.confirm')}
      </PrimaryButton>
    </View>
  );
};

const styles = StyleSheet.create({
  // The pair stacks, it does not share a line. Side by side each label had
  // half a phone to live in, and the second action is the longest string this
  // screen can show — it is not always "Confirm": an expired quote turns it
  // into "Refresh Quote" / "Refresh Estimate", and the Spanish of those runs
  // edge to edge inside a half-width button. Full width fits every state's
  // copy without wrapping or clipping.
  //
  // The order is the app's, not this screen's: OnboardingLayout's ratified
  // band order is assist / secondary / action with the full-width primary
  // bottom-most, so Back sits above Confirm here too and the committing
  // action lands where the thumb already expects it.
  //
  // Both buttons already carry `width: '100%'`, and a column stretches its
  // children, so no wrapper is needed to make them full width — the halves
  // that used to split the row are gone with the row.
  buttonsContainer: {
    flexDirection: 'column',
    gap: vs(spacing.md),
  },
  // Height is the only legal override on either button, and it is fixed on
  // both — so the stack's own height is the same in every state and nothing
  // above it moves when the confirm label changes. Radius, fill, border and
  // material belong to the button itself: the pair used to carry a local 12px
  // radius and a salmon outline on Back, and a gradient wrapper that made
  // Confirm transparent — which cancelled the flesh the fill is supposed to
  // show. They differ by material now, not by shape.
  backButton: {
    minHeight: vs(componentSizes.buttonHeightCompact),
    height: vs(componentSizes.buttonHeightCompact),
  },
  confirmButton: {
    minHeight: vs(componentSizes.buttonHeightCompact),
    height: vs(componentSizes.buttonHeightCompact),
  },
});
