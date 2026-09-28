import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { spacing, vs, componentSizes } from '@salmon/shared';
import { PrimaryButton, SecondaryButton } from '../Button';
import type { ConfirmationButtonsProps } from './types';

/**
 * ConfirmationButtons - the Back/Confirm pair under the confirmation.
 */
export const ConfirmationButtons: React.FC<ConfirmationButtonsProps> = ({
  onBack,
  onConfirm,
  isRefreshing = false,
  confirmLabel,
  style,
}) => {
  const { t } = useTranslation();
  // A rebuild in flight owns the confirm button too: it says so while it
  // works, and stops accepting a second press on top of the first. A confirm
  // in flight is different — the review sinks at the tap and the wave wait
  // takes over (see ConfirmationHost), so the button never spins for it.
  return (
    <View style={[styles.buttonsContainer, style]}>
      <SecondaryButton
        onPress={onBack}
        disabled={isRefreshing}
        style={styles.backButton}
        testID="confirmation-back-button"
      >
        {t('general.back')}
      </SecondaryButton>
      <PrimaryButton
        onPress={onConfirm}
        loading={isRefreshing}
        disabled={isRefreshing}
        style={styles.confirmButton}
        testID="confirmation-confirm-button"
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
  // into "Refresh Quote", and the Spanish of that runs edge to edge inside a
  // half-width button. Full width fits every state's copy.
  //
  // The order is the app's, not this screen's: OnboardingLayout's ratified
  // band order is assist / secondary / action with the full-width primary
  // bottom-most, so Back sits above Confirm here too.
  buttonsContainer: {
    flexDirection: 'column',
    gap: vs(spacing.md),
  },
  // Height is the only legal override on either button, and it is fixed on
  // both — so the stack's own height is the same in every state and nothing
  // above it moves when the confirm label changes.
  backButton: {
    minHeight: vs(componentSizes.buttonHeightCompact),
    height: vs(componentSizes.buttonHeightCompact),
  },
  confirmButton: {
    minHeight: vs(componentSizes.buttonHeightCompact),
    height: vs(componentSizes.buttonHeightCompact),
  },
});
