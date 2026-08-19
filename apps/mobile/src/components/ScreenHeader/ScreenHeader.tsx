/**
 * ScreenHeader - Common header for onboarding/auth screens
 *
 * Includes back button, optional step indicator, and spacer for alignment.
 */
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CaretLeftIcon, XIcon } from '../../icons';
import { colors, componentSizes, contentPadding, semantic } from '@salmon/shared';
import type { Testable } from '@salmon/shared';
import { StepIndicator } from '../StepIndicator';

export interface ScreenHeaderProps extends Testable {
  /** Callback when back button is pressed */
  onBack?: () => void;
  /**
   * Glyph for the leading affordance. `close` for screens the affordance
   * exits rather than backs out of — declining advances, so a back chevron
   * would describe the wrong direction.
   */
  glyph?: 'back' | 'close';
  /** Accessible name for the affordance. Defaults to "Go back". */
  backLabel?: string;
  /** Show step indicator */
  stepIndicator?: {
    totalSteps: number;
    currentStep: number;
  };
  /** Disable back button */
  backDisabled?: boolean;
}

export function ScreenHeader({
  onBack,
  glyph = 'back',
  backLabel,
  stepIndicator,
  backDisabled,
  testID,
}: ScreenHeaderProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {/* Leading affordance: back, or close where declining advances */}
      <TouchableOpacity
        testID={testID ?? 'screen-header-back-button'}
        accessibilityRole="button"
        accessibilityLabel={backLabel ?? t('accessibility.go_back', 'Go back')}
        onPress={onBack}
        disabled={!onBack || backDisabled}
        style={styles.backButton}
        // 40pt visual box + 2pt slop per side = the 44pt minimum target
        // (DESIGN.md: hit-slop, never inflated visual size).
        hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
      >
        {onBack &&
          (glyph === 'close' ? (
            <XIcon
              size={componentSizes.iconSizeMedium}
              color={backDisabled ? semantic.text.secondary : colors.text.primary}
            />
          ) : (
            <CaretLeftIcon
              size={componentSizes.iconSizeMedium}
              color={backDisabled ? semantic.text.secondary : colors.text.primary}
            />
          ))}
      </TouchableOpacity>

      {/* Step indicator (centered) */}
      <View style={styles.center}>
        {stepIndicator && (
          <StepIndicator
            totalSteps={stepIndicator.totalSteps}
            currentStep={stepIndicator.currentStep}
          />
        )}
      </View>

      {/* Spacer for alignment */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: contentPadding.screen,
    height: componentSizes.headerHeight,
  },
  backButton: {
    width: componentSizes.backButtonSize,
    height: componentSizes.backButtonSize,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  spacer: {
    width: componentSizes.backButtonSize,
  },
});
