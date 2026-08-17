import React from 'react';
import { Text, StyleSheet } from 'react-native';
import {
  colors,
  fontSize,
  letterSpacing,
  lineHeight,
  spacing,
  borderRadius,
  ms,
  vs,
  s,
  fontFamilyNative,
  componentSizes,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import { PendingValue } from '../PendingValue';
import type { SwapDetailRowProps } from './types';

/**
 * SwapDetailRow - A single row in the swap details section
 * Displays label on left and value on right with glassmorphism effect
 */
export const SwapDetailRow: React.FC<SwapDetailRowProps> = ({
  label,
  value,
  pending = false,
  style,
}) => {
  return (
    <BlurContainer style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <PendingValue pending={pending}>
        <Text style={styles.value}>{value}</Text>
      </PendingValue>
    </BlurContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(spacing.base),
    paddingVertical: vs(spacing.sm),
    minHeight: vs(componentSizes.backButtonSize),
  },
  label: {
    fontSize: ms(fontSize.md),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
    letterSpacing: letterSpacing.slight,
    lineHeight: ms(15 * lineHeight.normal),
  },
  value: {
    fontSize: ms(fontSize.md),
    fontFamily: fontFamilyNative.extraBold,
    color: colors.text.primary,
    letterSpacing: letterSpacing.slight,
    lineHeight: ms(15 * lineHeight.normal),
  },
});

export default SwapDetailRow;
