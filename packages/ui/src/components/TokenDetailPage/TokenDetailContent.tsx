/**
 * TokenDetailContent — the token detail screen's body, on the DOM.
 *
 * The mobile twin is the body of `apps/mobile/app/(app)/token/[id].tsx`
 * (CORE 02, spec 019): the balance block (bubble + name, amount, fiat), the
 * performance block (current price, the chart with its own period selector,
 * the selected period's own change), the market data card and the about
 * card — every top-level child the component gap (20) from the next, the
 * blocks' own rows at the in-component step (12).
 *
 * One composition for every asset that has a detail view: the Solana token
 * pushed from the token list and the Bitcoin home tab, which is the same
 * screen without the push. A section omits itself when the asset has no data
 * for it — that is a difference in *data*, and the only kind allowed here.
 *
 * The container it sits in *is* the caller's business: the chart bleeds off
 * the left edge of whatever padding that container has, hence `bleed`.
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  formatLargeNumber,
  formatPercentage,
  getShortAddress,
  hiddenValue,
  lineHeight,
  spacing,
  tabularNums,
  useCurrencyContext,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { KeyValueRow } from '../KeyValueRow';
import { PriceChart } from '../PriceChart';
import { SkeletonRow } from '../SkeletonRow';
import { TokenAbout } from '../TokenAbout';
import { TokenLogo } from '../TokenList';
import { TokenMarketData } from '../TokenMarketData';
import type { TokenDetailContentProps } from './types';

/** The balance block's own logo size — mobile's `TOKEN_LOGO_SIZE`. */
const TOKEN_LOGO_SIZE = 42;

export function TokenDetailContent({
  token,
  blockchain = 'solana',
  hiddenBalance = false,
  chartData,
  chartPeriod,
  onChartPeriodChange,
  chartLoading = false,
  chartPending = false,
  chartError = false,
  coinInfo,
  marketData,
  infoLoading = false,
  bleed = spacing.screenGutter,
  style,
  className,
}: TokenDetailContentProps): React.ReactElement {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [, { formatValue }] = useCurrencyContext();

  // The chart's own first/last point, not the wallet's 24h figure — the
  // period selector redraws the chart, and the row under it answers "what did
  // THIS window do", the same question the chart itself is answering.
  const periodChangePercent = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    if (!first) return null;
    return ((last - first) / first) * 100;
  }, [chartData]);

  const numericAmount =
    typeof token?.uiAmount === 'string' ? parseFloat(token.uiAmount) : token?.uiAmount;
  const displayAmount = token
    ? hiddenBalance
      ? hiddenValue
      : `${formatLargeNumber(numericAmount ?? 0)} ${token.symbol}`
    : null;
  const displayFiat = token
    ? hiddenBalance
      ? hiddenValue
      : token.usdBalance != null
        ? formatValue(token.usdBalance)
        : null
    : null;

  // Bitcoin has no on-chain contract to copy; its "address" is the chain id.
  const contractAddress = blockchain === 'bitcoin' ? undefined : token?.address;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.screenGutter, ...style }}
      className={className}
    >
      {/* Asset balance block — CORE 02: bubble + name, amount, fiat. */}
      {token ? (
        <div
          data-testid="token-detail-balance"
          style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, minWidth: 0 }}>
            <TokenLogo
              uri={token.logo}
              symbol={token.symbol}
              size={TOKEN_LOGO_SIZE}
              borderRadius={borderRadius.tokenIcon}
            />
            <span style={nameStyle(semantic)}>{token.name}</span>
          </div>
          <span data-testid="token-detail-amount" style={amountStyle(semantic)}>
            {displayAmount}
          </span>
          {displayFiat != null && (
            <span data-testid="token-detail-fiat" style={fiatStyle(semantic)}>
              {displayFiat}
            </span>
          )}
        </div>
      ) : (
        <SkeletonRow
          testID="token-detail-balance"
          lines={2}
          leadingSize={TOKEN_LOGO_SIZE}
          count={1}
          accessibilityLabel={t('accessibility.loading_token_info', 'Loading token information')}
        />
      )}

      {/* Performance — current price, the chart with its own period selector,
          and the selected period's own change. No card around it (owner,
          2026-09-01): the curve runs off the left edge and stops a gutter
          short of the right; a card would clip both. */}
      <div
        data-testid="token-detail-performance"
        style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}
      >
        <KeyValueRow
          label={t('token.detail.currentPrice', 'Current price')}
          value={token?.price != null ? formatValue(token.price) : '—'}
        />
        {(chartLoading || chartData.length > 0 || chartError) && (
          <PriceChart
            data={chartData}
            selectedPeriod={chartPeriod}
            onPeriodChange={onChartPeriodChange}
            loading={chartLoading}
            pending={chartPending}
            error={chartError}
            style={{ marginLeft: -bleed, width: `calc(100% + ${bleed}px)` }}
          />
        )}
        {periodChangePercent != null && (
          <KeyValueRow
            testID="token-detail-period-change"
            label={t('token.detail.periodChange', '{{period}} change', { period: chartPeriod })}
            value={formatPercentage(periodChangePercent)}
            valueTone={periodChangePercent >= 0 ? 'success' : 'danger'}
          />
        )}
      </div>

      {/* Market data — spec 019 D2: a Card of KeyValueRows. */}
      <TokenMarketData data={marketData} symbol={token?.symbol} loading={infoLoading} />

      {/* About — spec 019 D3: description, contract address copy row and
          website link. The contract row has no data dependency of its own, so
          the card renders even for a token CoinGecko has nothing to say about. */}
      <TokenAbout
        description={coinInfo?.description}
        contractAddress={contractAddress}
        contractAddressShort={
          contractAddress ? (getShortAddress(contractAddress, 6) ?? contractAddress) : undefined
        }
        website={coinInfo?.links?.homepage}
        loading={infoLoading}
      />
    </div>
  );
}

const nameStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.heading,
  lineHeight: `${fontSize.heading * lineHeight.snug}px`,
  color: t.text.primary,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const amountStyle = (t: Semantic): React.CSSProperties => ({
  ...tabularNums.css,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.display,
  lineHeight: `${fontSize.display * lineHeight.snug}px`,
  color: t.text.primary,
});

const fiatStyle = (t: Semantic): React.CSSProperties => ({
  ...tabularNums.css,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  fontSize: fontSize.body,
  lineHeight: `${fontSize.body * lineHeight.snug}px`,
  color: t.text.secondary,
});
