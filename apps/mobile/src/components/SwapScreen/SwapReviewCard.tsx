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
import type { SwapReviewCardProps } from './types';

/**
 * SwapReviewCard - Card displaying token amount for review screen
 * Shows label (You Send/You Receive) and the amount with symbol
 */
export const SwapReviewCard: React.FC<SwapReviewCardProps> = ({
  label,
  amount,
  usdValue,
  pendingAmount = false,
  pendingUsdValue = false,
  style,
}) => {
  return (
    <BlurContainer style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <PendingValue pending={pendingAmount}>
        <Text style={styles.amount}>{amount}</Text>
      </PendingValue>
      {usdValue != null && (
        <PendingValue pending={pendingUsdValue}>
          <Text style={styles.usdValue}>{usdValue}</Text>
        </PendingValue>
      )}
    </BlurContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    paddingHorizontal: s(spacing.base),
    paddingVertical: vs(spacing.sm),
    minHeight: vs(componentSizes.swapReviewCardMinHeight),
    justifyContent: 'center',
  },
  label: {
    fontSize: ms(fontSize.md),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
    letterSpacing: letterSpacing.slight,
    lineHeight: ms(15 * lineHeight.normal),
  },
  amount: {
    fontSize: ms(fontSize['2xl']),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    letterSpacing: letterSpacing.snug,
    lineHeight: ms(fontSize['2xl'] * lineHeight.tight),
    marginTop: vs(spacing.xxs),
  },
  usdValue: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
    letterSpacing: letterSpacing.slight,
    lineHeight: ms(13 * lineHeight.tokenListItem),
    marginTop: vs(spacing.xxs),
  },
});

export default SwapReviewCard;
