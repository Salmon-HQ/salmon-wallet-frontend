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
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  formatLargeNumber,
  formatPercentage,
  getShortAddress,
  hiddenValue,
  letterSpacing,
  spacing,
  tabularNums,
  useCurrencyContext,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { IconBubble } from '../IconBubble';
import { ValueActionsRow } from '../ValueActionsRow';
import { ArrowUpRightIcon } from '../../icons';
import { KeyValueRow } from '../KeyValueRow';
import { PriceChart } from '../PriceChart';
import { SkeletonRow } from '../SkeletonRow';
import { DataAttribution } from '../DataAttribution';
import { TokenAbout } from '../TokenAbout';
import { TokenMarketData } from '../TokenMarketData';
import type { TokenDetailContentProps } from './types';

const BALANCE_MIN_FONT_SCALE = 0.6;

export function TokenDetailContent({
  token,
  onSendPress,
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
  networkId,
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
  const displayPrice = token?.price != null ? formatValue(token.price) : null;
  const fiatLine = [displayFiat, displayPrice].filter((part) => part != null).join(' · ') || null;

  const amountBoxRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLSpanElement>(null);
  const [amountFit, setAmountFit] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      const box = amountBoxRef.current;
      const span = amountRef.current;
      if (!box || !span) return;
      const needed = span.scrollWidth / (amountFit || 1);
      const available = box.clientWidth;
      setAmountFit(needed > available ? Math.max(BALANCE_MIN_FONT_SCALE, available / needed) : 1);
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(fit);
    if (amountBoxRef.current) observer.observe(amountBoxRef.current);
    return () => observer.disconnect();
  }, [displayAmount, amountFit]);

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
          <div ref={amountBoxRef} style={{ minWidth: 0 }}>
            <span
              ref={amountRef}
              data-testid="token-detail-amount"
              style={{ ...amountStyle(semantic), fontSize: fontSize.balance * amountFit }}
            >
              {displayAmount}
            </span>
          </div>
          <ValueActionsRow
            leading={
              fiatLine != null ? (
                <span data-testid="token-detail-fiat" style={fiatStyle(semantic)}>
                  {fiatLine}
                </span>
              ) : null
            }
            actions={
              onSendPress ? (
                <IconBubble
                  testID="token-detail-send-button"
                  size={componentSizes.iconBubbleSm}
                  tone="accent"
                  icon={ArrowUpRightIcon}
                  iconWeight="bold"
                  iconSize={componentSizes.iconSizeXSmall}
                  onPress={onSendPress}
                  accessibilityLabel={t('accessibility.send_tokens', 'Send tokens')}
                />
              ) : undefined
            }
          />
        </div>
      ) : (
        <SkeletonRow
          testID="token-detail-balance"
          lines={2}
          leadingSize={componentSizes.iconSizeMedium}
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

      {/* The provider behind the chart, the market data and the description
          is credited here, on the one screen that is made of its data. */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DataAttribution networkId={networkId} />
      </div>
    </div>
  );
}

const amountStyle = (t: Semantic): React.CSSProperties => ({
  ...tabularNums.css,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.balance,
  letterSpacing: letterSpacing.balance,
  color: t.text.primary,
  whiteSpace: 'nowrap',
});

const fiatStyle = (t: Semantic): React.CSSProperties => ({
  ...tabularNums.css,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.bodyLg,
  letterSpacing: letterSpacing.change,
  color: t.text.secondary,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
