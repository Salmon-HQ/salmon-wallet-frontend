import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  spacing,
  borderRadius,
  gradients,
  shadows,
  vs,
  s,
  borderWidth,
  componentSizes,
  semantic,
} from '@salmon/shared';
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
      <LinearGradient
        colors={gradients.primaryButton.colors}
        start={gradients.primaryButton.start}
        end={gradients.primaryButton.end}
        style={styles.confirmButtonGradient}
      >
        <PrimaryButton
          onPress={onConfirm}
          loading={isBusy}
          disabled={isBusy}
          style={styles.confirmButton}
          testID="swap-confirm-button"
        >
          {confirmLabel ?? t('general.confirm')}
        </PrimaryButton>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonsContainer: {
    flexDirection: 'row',
    gap: s(spacing.md),
  },
  backButton: {
    flex: 1,
    height: vs(componentSizes.buttonHeightCompact),
    borderWidth: borderWidth.accent,
    borderColor: semantic.border.raised,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.button.cancelBackground,
  },
  confirmButtonGradient: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: borderWidth.accent,
    borderColor: semantic.accent.fill,
    // The row stretches this gradient to match the taller Back button
    // (SecondaryButton has minHeight: buttonHeight); center the inner
    // PrimaryButton so its label sits in the vertical middle instead of the top.
    justifyContent: 'center',
    ...shadows.button,
  },
  confirmButton: {
    height: vs(componentSizes.buttonHeightCompact),
    backgroundColor: 'transparent',
  },
});
