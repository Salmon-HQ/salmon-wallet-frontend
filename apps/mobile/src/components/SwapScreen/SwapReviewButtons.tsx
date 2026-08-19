import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { spacing, vs, s, componentSizes } from '@salmon/shared';
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
      <View style={styles.half}>
        <SecondaryButton
          onPress={onBack}
          disabled={isBusy}
          style={styles.backButton}
          testID="swap-back-button"
        >
          {t('general.back')}
        </SecondaryButton>
      </View>
      <View style={styles.half}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  buttonsContainer: {
    flexDirection: 'row',
    gap: s(spacing.md),
  },
  // The row is a symmetric pair: two halves of one decision, so they are the
  // same width. `flex: 1` cannot live on the buttons themselves — Yoga floors a
  // flex child's base size at its own horizontal padding and border
  // (`max(flexBasis, paddingAndBorderAlongMainAxis)`), and SecondaryButton
  // carries `paddingHorizontal: spacing.lg` while PrimaryButton carries none.
  // Both said `flex: 1` and Back still came out `2 * spacing.lg` wider. These
  // wrappers own the split instead: they have no padding, so the halves are
  // exactly equal, and each button fills its half through its own `width: 100%`.
  // They draw nothing — the same layout-only split the DOM half already uses.
  half: {
    flex: 1,
  },
  // Height is the only legal override on either button. Radius, fill, border
  // and material belong to the button itself: the pair used to carry a local
  // 12px radius and a salmon outline on Back, and a gradient wrapper that made
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
