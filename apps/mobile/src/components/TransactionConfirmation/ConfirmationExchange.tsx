import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import i18n from 'i18next';
import {
  fontSize,
  formatTokenAmountSignificant,
  letterSpacing,
  lineHeight,
  spacing,
  ms,
  vs,
  s,
  fontFamilyNative,
  tabularNums,
  type Semantic,
} from '@salmon/shared';
import type { SwapReviewExchangeSide } from '@salmon/shared';
import { ArrowRightIcon, iconSize } from '../../icons';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { PendingValue } from '../PendingValue';
import { TokenLogo } from '../TokenLogo';
import type { ConfirmationExchangeProps } from './types';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable array, so it is spread into a fresh one.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

const LOGO_SIZE = 40;

/**
 * The proposal formats `amount` at full precision as "<number> <SYMBOL>".
 * The review reads better trimmed to significant digits — the full figure
 * still renders in the details card's "Minimum Received" row.
 */
function toSignificantAmount(raw: string): string {
  const spaceIdx = raw.lastIndexOf(' ');
  if (spaceIdx < 0) return raw;
  const numPart = raw.slice(0, spaceIdx);
  const symbolPart = raw.slice(spaceIdx + 1);
  const normalized = i18n.language?.startsWith('es') ? numPart.replace(',', '.') : numPart;
  const value = parseFloat(normalized);
  if (!isFinite(value)) return raw;
  return `${formatTokenAmountSignificant(value, i18n.language)} ${symbolPart}`;
}

/** The Portfolio list drops the "~"; the review reads the same way. */
function stripApprox(raw: string): string {
  return raw.replace(/^~\s*/, '');
}

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
  emphasis = false,
}) => {
  const styles = useThemedStyles(stylesFor);
  return (
    <View style={styles.side}>
      <Text style={styles.label}>{label}</Text>
      <TokenLogo uri={logo} symbol={symbol} size={s(LOGO_SIZE)} />
      <PendingValue pending={pendingAmount}>
        <Text
          style={[styles.amount, TABULAR, emphasis && styles.amountEmphasis]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {toSignificantAmount(amount)}
        </Text>
      </PendingValue>
      {usdValue != null && (
        <PendingValue pending={pendingUsdValue}>
          <Text style={[styles.usdValue, TABULAR]}>{stripApprox(usdValue)}</Text>
        </PendingValue>
      )}
    </View>
  );
};

/**
 * ConfirmationExchange - the single graphic block on the confirmation
 * screen: sent token logo, arrow, received token logo, with amounts
 * underneath.
 */
export const ConfirmationExchange: React.FC<ConfirmationExchangeProps> = ({
  send,
  receive,
  style,
}) => {
  const styles = useThemedStyles(stylesFor);
  const { accent } = useSemantic();
  return (
    <View style={[styles.row, style]} testID="confirmation-exchange">
      <ExchangeSide {...send} />
      <ArrowRightIcon size={iconSize.md} color={accent.ink} weight="bold" />
      <ExchangeSide {...receive} />
    </View>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
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
      color: t.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: letterSpacing.wider,
      textAlign: 'center',
    },
    amount: {
      fontSize: ms(fontSize.lg),
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
      letterSpacing: letterSpacing.snug,
      lineHeight: ms(fontSize.lg * lineHeight.tight),
      textAlign: 'center',
    },
    // The received amount on a success receipt outranks the sent one — one
    // step up in size, same tabular digits.
    amountEmphasis: {
      fontSize: ms(fontSize.xl),
      lineHeight: ms(fontSize.xl * lineHeight.tight),
    },
    usdValue: {
      fontSize: ms(fontSize.sm),
      fontFamily: fontFamilyNative.medium,
      color: t.text.secondary,
      letterSpacing: letterSpacing.slight,
      lineHeight: ms(fontSize.sm * lineHeight.tokenListItem),
      textAlign: 'center',
    },
  });

export default ConfirmationExchange;
