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
  // and stops accepting a second press on top of the first.
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
        loading={isBusy}
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
  buttonsContainer: {
    flexDirection: 'row',
    gap: s(spacing.md),
  },
  // Height is the only legal override on either button. Radius, fill, border
  // and material belong to the button itself: the pair used to carry a local
  // 12px radius and a salmon outline on Back, and a gradient wrapper that made
  // Confirm transparent — which cancelled the flesh the fill is supposed to
  // show. They differ by material now, not by shape.
  backButton: {
    flex: 1,
    minHeight: vs(componentSizes.buttonHeightCompact),
    height: vs(componentSizes.buttonHeightCompact),
  },
  confirmButton: {
    flex: 1,
    minHeight: vs(componentSizes.buttonHeightCompact),
    height: vs(componentSizes.buttonHeightCompact),
  },
});
