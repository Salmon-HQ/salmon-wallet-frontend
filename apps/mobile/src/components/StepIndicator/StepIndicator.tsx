/**
 * StepIndicator - Shows progress through multi-step flows
 *
 * Displays dots indicating current step in a sequence.
 */
import { View, StyleSheet } from 'react-native';
import { colors, componentSizes } from '@salmon/shared';
import type { StepIndicatorProps } from './types';

export function StepIndicator({ totalSteps, currentStep }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          style={[styles.dot, index + 1 === currentStep ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: componentSizes.stepDotGap,
  },
  dot: {
    width: componentSizes.stepDotSize,
    height: componentSizes.stepDotSize,
    borderRadius: componentSizes.stepDotSize / 2,
  },
  dotActive: {
    backgroundColor: colors.step.active,
  },
  dotInactive: {
    backgroundColor: colors.step.inactive,
  },
});
