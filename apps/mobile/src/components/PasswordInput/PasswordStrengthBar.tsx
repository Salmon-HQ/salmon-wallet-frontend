/**
 * PasswordStrengthBar - Visual indicator of password strength
 */
import { View, Text, StyleSheet } from 'react-native';
import {
  spacing,
  borderRadius,
  fontSize,
  fontFamilyNative,
  semantic,
} from '@salmon/shared';
import { PasswordStrength, getPasswordStrengthLabel } from '@salmon/shared';

interface PasswordStrengthBarProps {
  strength: PasswordStrength;
  t?: (key: string) => string;
}

export function PasswordStrengthBar({ strength, t }: PasswordStrengthBarProps) {
  const getStrengthColor = () => {
    switch (strength) {
      case 'strong':
        return semantic.status.success;
      case 'medium':
        return semantic.status.warning;
      default:
        return semantic.status.danger;
    }
  };

  const getBarCount = () => {
    switch (strength) {
      case 'strong':
        return 3;
      case 'medium':
        return 2;
      default:
        return 1;
    }
  };

  const barColor = getStrengthColor();
  const activeCount = getBarCount();
  const label = getPasswordStrengthLabel(strength, t);

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={[
              styles.bar,
              { backgroundColor: index < activeCount ? barColor : semantic.step.inactive },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: barColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  bar: {
    width: 32,
    height: 4,
    borderRadius: borderRadius.scrollbar,
  },
  label: {
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.caption,
  },
});
