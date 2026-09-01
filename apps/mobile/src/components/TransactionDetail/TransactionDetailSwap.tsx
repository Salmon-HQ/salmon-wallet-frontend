/**
 * The swap half of the transaction detail: what was converted, at what rate,
 * and through which venues.
 *
 * It lives beside `TransactionDetail` rather than inside it because the two
 * variants share nothing but the shell's cards — the conversion columns and
 * the route hops are swap vocabulary, and keeping them here holds both files
 * under the size the repo reads comfortably.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, iconSize } from '../../icons';
import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  formatRawAmount,
  lineHeight,
  s,
  spacing,
  tabularNums,
  vs,
  type Semantic,
} from '@salmon/shared';

import { Card } from '../Card';
import { Chip } from '../Chip';
import { TokenLogo } from '../TokenLogo';
import { ConversionRateDisplay } from '../Activity/ConversionRateDisplay';
import { PriceImpactBadge } from '../Activity/PriceImpactBadge';
import { useThemedStyles, useSemantic } from '../../theme/useThemedStyles';
import type { SwapConversionRate, Transaction } from './types';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one, so copy it once here.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

/** The token mark in a conversion column (CORE 09). */
const TOKEN_MARK_SIZE = 42;

/**
 * One side of the conversion: mark, amount, ticker.
 */
const ConversionColumn: React.FC<{
  logo?: string | null;
  symbol: string;
  amount: string;
  decimals: number;
  testID?: string;
}> = ({ logo, symbol, amount, decimals, testID }) => {
  const styles = useThemedStyles(stylesFor);
  return (
    <View style={styles.column} testID={testID}>
      <TokenLogo uri={logo || undefined} symbol={symbol} size={TOKEN_MARK_SIZE} />
      <Text style={styles.amount} maxFontSizeMultiplier={fontScaleCap.dense} numberOfLines={1}>
        {formatRawAmount(amount, decimals)}
      </Text>
      <Text style={styles.ticker} maxFontSizeMultiplier={fontScaleCap.dense} numberOfLines={1}>
        {symbol}
      </Text>
    </View>
  );
};

export interface TransactionDetailSwapProps {
  transaction: Transaction;
  /** Derived by the shell — a swap with no route data still has a rate. */
  conversionRate: SwapConversionRate | null;
}

export const TransactionDetailSwap: React.FC<TransactionDetailSwapProps> = ({
  transaction,
  conversionRate,
}) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();
  const fromToken = transaction.outputs[0];
  const toToken = transaction.inputs[0];
  const hops = transaction.swapRoute?.hops ?? [];

  return (
    <>
      <Card padding="lg" gap={spacing.md} testID="tx-detail-conversion">
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('transactions.detail.conversion', 'Conversion')}</Text>
          {transaction.swapRoute?.priceImpact && (
            <PriceImpactBadge value={transaction.swapRoute.priceImpact} size="medium" showIcon />
          )}
        </View>

        {fromToken && toToken && (
          <View style={styles.conversion}>
            <ConversionColumn
              logo={fromToken.logo}
              symbol={fromToken.symbol}
              amount={fromToken.amount}
              decimals={fromToken.decimals}
              testID="tx-detail-conversion-from"
            />
            <ArrowRightIcon size={iconSize.lg} color={text.secondary} />
            <ConversionColumn
              logo={toToken.logo}
              symbol={toToken.symbol}
              amount={toToken.amount}
              decimals={toToken.decimals}
              testID="tx-detail-conversion-to"
            />
          </View>
        )}

        {conversionRate && (
          <View style={styles.rateRow}>
            <ConversionRateDisplay
              fromSymbol={conversionRate.fromSymbol}
              toSymbol={conversionRate.toSymbol}
              rate={conversionRate.rate}
              size="medium"
            />
          </View>
        )}
      </Card>

      {hops.length > 0 && (
        <Card padding="lg" gap={spacing.sm} testID="tx-detail-route">
          <Text style={styles.cardTitle}>{t('transactions.detail.swapRoute', 'Swap Route')}</Text>
          {hops.map((hop, index) => (
            <View key={`hop-${index}`} style={styles.hopRow}>
              <Chip label={hop.dex} size="sm" variant="outline" />
              <View style={styles.hopTokens}>
                <Text style={styles.hopText}>{hop.inputToken.symbol}</Text>
                <ArrowRightIcon size={iconSize.sm} color={text.secondary} />
                <Text style={styles.hopText}>{hop.outputToken.symbol}</Text>
              </View>
              {hop.percent < 100 && <Text style={styles.hopText}>{hop.percent}%</Text>}
            </View>
          ))}
        </Card>
      )}
    </>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      fontSize: s(fontSize.mono),
      lineHeight: s(fontSize.mono) * lineHeight.snug,
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
    },
    conversion: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s(spacing.md),
    },
    column: {
      flex: 1,
      alignItems: 'center',
      gap: vs(spacing.xs),
    },
    amount: {
      fontSize: s(fontSize.heading),
      lineHeight: s(fontSize.heading) * lineHeight.snug,
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
      ...TABULAR,
    },
    ticker: {
      fontSize: s(fontSize.micro),
      lineHeight: s(fontSize.micro) * lineHeight.snug,
      fontFamily: fontFamilyNative.semiBold,
      color: t.text.secondary,
    },
    /** The exchange rate closes the card under a hairline, as CORE 09 draws it. */
    rateRow: {
      alignItems: 'center',
      paddingTop: vs(spacing.md),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border.hairline,
    },
    hopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
    },
    hopTokens: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.xs),
    },
    hopText: {
      fontSize: s(fontSize.caption),
      lineHeight: s(fontSize.caption) * lineHeight.snug,
      fontFamily: fontFamilyNative.semiBold,
      color: t.text.secondary,
    },
  });

export default TransactionDetailSwap;
