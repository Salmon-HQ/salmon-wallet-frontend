import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  ms,
  s,
  spacing,
  fontSize,
  formatConversionRate,
  fontFamilyNative,
} from '@salmon/shared';

// ============================================================================
// Constants
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface ConversionRateDisplayProps {
  /** Input token symbol */
  fromSymbol: string;
  /** Output token symbol */
  toSymbol: string;
  /** The conversion rate (how many toTokens per 1 fromToken) */
  rate: string;
  /** Optional size variant */
  size?: 'small' | 'medium';
  /** Custom style */
  style?: ViewStyle;
}

// ============================================================================
// Helper Functions
// ============================================================================

// ============================================================================
// Main Component
// ============================================================================

/**
 * ConversionRateDisplay - Displays the conversion rate for swap transactions
 *
 * Shows the rate in format "1 SOL = 150.25 USDC" or compact "1:150.25" for small size.
 *
 * @example
 * ```tsx
 * <ConversionRateDisplay
 *   fromSymbol="SOL"
 *   toSymbol="USDC"
 *   rate="150.25"
 * />
 * ```
 */
export const ConversionRateDisplay: React.FC<ConversionRateDisplayProps> = ({
  fromSymbol,
  toSymbol,
  rate,
  size = 'medium',
  style,
}) => {
  const formattedRate = useMemo(() => formatConversionRate(rate), [rate]);

  const isSmall = size === 'small';

  if (isSmall) {
    // Compact format: "1:150.25"
    return (
      <View style={[styles.container, styles.containerSmall, style]}>
        <Ionicons
          name="swap-horizontal"
          size={12}
          color={colors.text.secondary}
          style={styles.iconSmall}
        />
        <Text style={styles.compactText}>1:{formattedRate}</Text>
      </View>
    );
  }

  // Full format: "1 SOL = 150.25 USDC"
  return (
    <View style={[styles.container, style]}>
      <Ionicons
        name="swap-horizontal"
        size={14}
        color={colors.text.secondary}
        style={styles.icon}
      />
      <Text style={styles.text}>
        <Text style={styles.symbolText}>1 {fromSymbol}</Text>
        <Text style={styles.equalsText}> = </Text>
        <Text style={styles.rateText}>{formattedRate} </Text>
        <Text style={styles.symbolText}>{toSymbol}</Text>
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
  },
  containerSmall: {
    // Additional styles for small variant if needed
  },
  icon: {
    marginRight: s(spacing.xs),
  },
  iconSmall: {
    marginRight: s(spacing.xs),
  },
  text: {
    fontSize: ms(fontSize.sm),
    color: colors.text.secondary,
  },
  symbolText: {
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
  },
  equalsText: {
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
  },
  rateText: {
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
  },
  compactText: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
  },
});

export default ConversionRateDisplay;
