import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
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
  tabularNums,
} from '@salmon/shared';
import type { SwapReviewExchangeSide } from '@salmon/shared';
import { ArrowRightIcon, iconSize } from '../../icons';
import { BlurContainer } from '../BlurContainer';
import { PendingValue } from '../PendingValue';
import { TokenLogo } from '../TokenLogo';
import type { SwapReviewExchangeProps } from './types';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable array, so it is spread into a fresh one.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

const LOGO_SIZE = 40;

/**
 * One half of the exchange graphic: microcopy label, token logo, amount in
 * the token, USD value underneath.
 */
const ExchangeSide: React.FC<SwapReviewExchangeSide> = ({
  label,
  logo,
  symbol,
  amount,
  usdValue,
  pendingAmount = false,
  pendingUsdValue = false,
}) => (
  <View style={styles.side}>
    <Text style={styles.label}>{label}</Text>
    <TokenLogo uri={logo} symbol={symbol} size={s(LOGO_SIZE)} />
    <PendingValue pending={pendingAmount}>
      <Text style={[styles.amount, TABULAR]}>{amount}</Text>
    </PendingValue>
    {usdValue != null && (
      <PendingValue pending={pendingUsdValue}>
        <Text style={[styles.usdValue, TABULAR]}>{usdValue}</Text>
      </PendingValue>
    )}
  </View>
);

/**
 * SwapReviewExchange - the single graphic block on the swap and bridge
 * review screens: sent token logo, arrow, received token logo, with amounts
 * underneath. Replaces the two stacked You Send / You Receive cards.
 */
export const SwapReviewExchange: React.FC<SwapReviewExchangeProps> = ({
  send,
  receive,
  style,
}) => {
  return (
    <BlurContainer style={[styles.container, style]}>
      <View style={styles.row} testID="swap-review-exchange">
        <ExchangeSide {...send} />
        <ArrowRightIcon size={iconSize.md} color={colors.text.secondary} />
        <ExchangeSide {...receive} />
      </View>
    </BlurContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(spacing.base),
    paddingVertical: vs(spacing.base),
    gap: s(spacing.sm),
  },
  side: {
    flex: 1,
    alignItems: 'center',
    gap: vs(spacing.xs),
  },
  label: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wider,
    textAlign: 'center',
  },
  amount: {
    fontSize: ms(fontSize.lg),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    letterSpacing: letterSpacing.snug,
    lineHeight: ms(fontSize.lg * lineHeight.tight),
    textAlign: 'center',
  },
  usdValue: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
    letterSpacing: letterSpacing.slight,
    lineHeight: ms(fontSize.sm * lineHeight.tokenListItem),
    textAlign: 'center',
  },
});

export default SwapReviewExchange;
