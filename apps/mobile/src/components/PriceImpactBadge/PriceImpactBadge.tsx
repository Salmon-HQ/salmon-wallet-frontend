import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircleIcon, WarningCircleIcon, WarningIcon } from '../../icons';
import type { IconComponent } from '../../icons';

const SEVERITY_ICONS: Record<PriceImpactSeverity, IconComponent> = {
  safe: CheckCircleIcon,
  warning: WarningIcon,
  high: WarningCircleIcon,
};
import {
  ms,
  vs,
  s,
  spacing,
  borderRadius,
  fontFamilyNative,
  getPriceImpactSeverity,
  priceImpactInkFor,
  PRICE_IMPACT_SIZES,
  type PriceImpactSeverity,
} from '@salmon/shared';
import { useSemantic } from '../../theme/useThemedStyles';
import type { PriceImpactBadgeProps } from './types';

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
  const t = useSemantic();
  const severity = getPriceImpactSeverity(value);
  const color = priceImpactInkFor(t)[severity];
  const SeverityIcon = SEVERITY_ICONS[severity];
  const sizeConfig = PRICE_IMPACT_SIZES[size];

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
