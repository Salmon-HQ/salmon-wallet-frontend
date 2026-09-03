/**
 * The swap half of the transaction detail: what was converted, at what rate,
 * and through which venues.
 *
 * The mobile twin is
 * `apps/mobile/src/components/TransactionDetail/TransactionDetailSwap.tsx`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  formatRawAmount,
  lineHeight,
  spacing,
  tabularNums,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { ArrowRightIcon, iconSize } from '../../icons';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { TokenLogo } from '../TokenList/TokenLogo';
import { ConversionRateDisplay } from '../TransactionHistoryPage/ConversionRateDisplay';
import { PriceImpactBadge } from '../TransactionHistoryPage/PriceImpactBadge';
import { cardTitleStyle } from './detailStyles';
import type { SwapConversionRate, Transaction } from './types';

/** The token mark in a conversion column (CORE 09). */
const TOKEN_MARK_SIZE = 42;

/** One side of the conversion: mark, amount, ticker. */
function ConversionColumn({
  logo,
  symbol,
  amount,
  decimals,
  testID,
}: {
  logo?: string | null;
  symbol: string;
  amount: string;
  decimals: number;
  testID?: string;
}) {
  const t = useSemantic();
  return (
    <div
      data-testid={testID}
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing.xs,
      }}
    >
      <TokenLogo
        uri={logo || undefined}
        symbol={symbol}
        size={TOKEN_MARK_SIZE}
        borderRadius={borderRadius.full}
      />
      <span
        style={{
          fontFamily: fontFamily.sans,
          fontSize: fontSize.heading,
          lineHeight: `${fontSize.heading * lineHeight.snug}px`,
          fontWeight: fontWeight.bold,
          color: t.text.primary,
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...tabularNums.css,
        }}
      >
        {formatRawAmount(amount, decimals)}
      </span>
      <span
        style={{
          fontFamily: fontFamily.sans,
          fontSize: fontSize.micro,
          lineHeight: `${fontSize.micro * lineHeight.snug}px`,
          fontWeight: fontWeight.semibold,
          color: t.text.secondary,
        }}
      >
        {symbol}
      </span>
    </div>
  );
}

export interface TransactionDetailSwapProps {
  transaction: Transaction;
  /** Derived by the shell — a swap with no route data still has a rate. */
  conversionRate: SwapConversionRate | null;
}

export function TransactionDetailSwap({ transaction, conversionRate }: TransactionDetailSwapProps) {
  const { t: translate } = useTranslation();
  const t = useSemantic();
  const fromToken = transaction.outputs[0];
  const toToken = transaction.inputs[0];
  const hops = transaction.swapRoute?.hops ?? [];

  const hopText: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    lineHeight: `${fontSize.caption * lineHeight.snug}px`,
    fontWeight: fontWeight.semibold,
    color: t.text.secondary,
  };

  return (
    <>
      <Card padding="lg" gap={spacing.md} testID="tx-detail-conversion">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={cardTitleStyle(t)}>
            {translate('transactions.detail.conversion', 'Conversion')}
          </h3>
          {transaction.swapRoute?.priceImpact && (
            <PriceImpactBadge value={transaction.swapRoute.priceImpact} size="medium" showIcon />
          )}
        </div>

        {fromToken && toToken && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.md,
            }}
          >
            <ConversionColumn
              logo={fromToken.logo}
              symbol={fromToken.symbol}
              amount={fromToken.amount}
              decimals={fromToken.decimals}
              testID="tx-detail-conversion-from"
            />
            <ArrowRightIcon size={iconSize.lg} color={t.text.secondary} />
            <ConversionColumn
              logo={toToken.logo}
              symbol={toToken.symbol}
              amount={toToken.amount}
              decimals={toToken.decimals}
              testID="tx-detail-conversion-to"
            />
          </div>
        )}

        {conversionRate && (
          // The exchange rate closes the card under a hairline, as CORE 09 draws it.
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: spacing.md,
              borderTop: `${borderWidth.thin}px solid ${t.border.hairline}`,
            }}
          >
            <ConversionRateDisplay
              fromSymbol={conversionRate.fromSymbol}
              toSymbol={conversionRate.toSymbol}
              rate={conversionRate.rate}
              size="medium"
            />
          </div>
        )}
      </Card>

      {hops.length > 0 && (
        <Card padding="lg" gap={spacing.sm} testID="tx-detail-route">
          <h3 style={cardTitleStyle(t)}>
            {translate('transactions.detail.swapRoute', 'Swap Route')}
          </h3>
          {hops.map((hop, index) => (
            <div
              key={`hop-${index}`}
              style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}
            >
              <Chip label={hop.dex} size="sm" variant="outline" />
              <span
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}
              >
                <span style={hopText}>{hop.inputToken.symbol}</span>
                <ArrowRightIcon size={iconSize.sm} color={t.text.secondary} />
                <span style={hopText}>{hop.outputToken.symbol}</span>
              </span>
              {hop.percent < 100 && <span style={hopText}>{hop.percent}%</span>}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
