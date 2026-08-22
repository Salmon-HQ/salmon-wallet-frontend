import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircleIcon, WarningCircleIcon, WarningIcon } from '../../icons';
import type { IconComponent } from '../../icons';
import {
  ms,
  vs,
  s,
  fontSize,
  spacing,
  borderRadius,
  fontFamilyNative,
  getPriceImpactSeverity,
  type PriceImpactSeverity,
  semantic,
} from '@salmon/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Size variants for the PriceImpactBadge
 */
type PriceImpactSize = 'small' | 'medium' | 'large';

/**
 * Props for the PriceImpactBadge component
 */
export interface PriceImpactBadgeProps {
  /** Price impact as a string percentage (e.g., "0.5", "1.2") */
  value: string;
  /** Size variant */
  size?: PriceImpactSize;
  /** Whether to show the warning/check icon */
  showIcon?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Price impact thresholds
 * - Safe: < 0.5%
 * - Warning: 0.5% - 1%
 * - High: > 1%
 */
/**
 * Icon mapping for each severity level
 */
const SEVERITY_ICONS: Record<PriceImpactSeverity, IconComponent> = {
  safe: CheckCircleIcon,
  warning: WarningIcon,
  high: WarningCircleIcon,
};

/**
 * Color mapping for each severity level
 */
const SEVERITY_COLORS: Record<PriceImpactSeverity, string> = {
  safe: semantic.status.success,
  warning: semantic.status.warning,
  high: semantic.status.danger,
};

/**
 * Size configurations for each variant
 */
const SIZE_CONFIG: Record<
  PriceImpactSize,
  { iconSize: number; fontSize: number; paddingH: number; paddingV: number }
> = {
  small: {
    iconSize: 12,
    fontSize: fontSize.xs,
    paddingH: spacing.xs,
    paddingV: 2,
  },
  medium: {
    iconSize: 14,
    fontSize: fontSize.sm,
    paddingH: spacing.sm,
    paddingV: 4,
  },
  large: {
    iconSize: 16,
    fontSize: fontSize.bodyLg,
    paddingH: spacing.md,
    paddingV: 6,
  },
};

// ============================================================================
// Component
// ============================================================================

/**
 * PriceImpactBadge - Displays price impact with color coding based on severity
 *
 * A reusable badge component that shows price impact percentage with
 * appropriate color coding and optional icons to indicate severity:
 * - Safe (< 0.5%): Green with checkmark icon
 * - Warning (0.5% - 1%): Yellow/Orange with warning icon
 * - High (> 1%): Red with alert icon
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PriceImpactBadge value="0.3" />
 *
 * // With icon and custom size
 * <PriceImpactBadge value="1.5" size="large" showIcon />
 *
 * // Warning level
 * <PriceImpactBadge value="0.8" showIcon />
 * ```
 */
export const PriceImpactBadge: React.FC<PriceImpactBadgeProps> = ({
  value,
  size = 'medium',
  showIcon = false,
}) => {
  const severity = getPriceImpactSeverity(value);
  const color = SEVERITY_COLORS[severity];
  const SeverityIcon = SEVERITY_ICONS[severity];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${color}15`,
          paddingHorizontal: s(sizeConfig.paddingH),
          paddingVertical: vs(sizeConfig.paddingV),
        },
      ]}
    >
      {showIcon && (
        <SeverityIcon
          size={ms(sizeConfig.iconSize)}
          color={color}
          style={styles.icon}
          weight={severity === 'safe' ? 'fill' : 'regular'}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color,
            fontSize: ms(sizeConfig.fontSize),
          },
        ]}
      >
        {value}%
      </Text>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  icon: {
    marginRight: s(spacing.xs),
  },
  text: {
    fontFamily: fontFamilyNative.medium,
  },
});

export default PriceImpactBadge;
