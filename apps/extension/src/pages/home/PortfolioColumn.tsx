import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  getBlockchainFromNetworkId,
  spacing,
  type BalanceLoadState,
  type BlockchainId,
  type PriceChartPeriod,
  type Token,
} from '@salmon/shared';

import {
  DataAttribution,
  StateBlock,
  TokenDetailContent,
  TokenList,
  WarningNotice,
} from '../../components';

import { scrollColumnStyle } from './homeStyles';
import type { HomeBitcoinMarketData } from './useHomeMarketData';

interface PortfolioColumnProps {
  currentChain: BlockchainId;
  currentNetworkId: string;
  balanceState: BalanceLoadState;
  balanceError: string | null;
  hasData: boolean;
  hiddenBalance: boolean;
  tokens: Token[];
  onTokenPress: (token: Token) => void;
  onRetry: () => void;
  bitcoin: HomeBitcoinMarketData;
  bitcoinChartPeriod: PriceChartPeriod;
  onBitcoinChartPeriodChange: (period: PriceChartPeriod) => void;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

/**
 * The Portfolio sub-tab's scroller: the token list for the active chain, or
 * the Bitcoin column (chart, market data, about) — Bitcoin lives inside
 * Portfolio because it has no asset-detail screen of its own.
 */
export function PortfolioColumn({
  currentChain,
  currentNetworkId,
  balanceState,
  balanceError,
  hasData,
  hiddenBalance,
  tokens,
  onTokenPress,
  onRetry,
  bitcoin,
  bitcoinChartPeriod,
  onBitcoinChartPeriodChange,
  onScroll,
}: PortfolioColumnProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div style={scrollColumnStyle} onScroll={onScroll}>
      {/* Partial-load failure: keep whatever data loaded visible. Only 'ready'
          carries data, so a total failure is left to the list's own error
          state rather than told "shown data may be incomplete". */}
      {balanceError && balanceState === 'ready' && (
        <div style={{ marginBottom: spacing.xl }} data-testid="balance-load-error">
          <WarningNotice
            tone="warning"
            title={t(
              'wallet.partial_load_error',
              "Some balances couldn't be loaded. Shown data may be incomplete."
            )}
          />
        </div>
      )}

      {currentChain === 'bitcoin' ? (
        <TokenDetailContent
          token={hasData ? bitcoin.token : undefined}
          blockchain="bitcoin"
          hiddenBalance={hiddenBalance}
          chartData={bitcoin.chartData}
          chartPeriod={bitcoinChartPeriod}
          onChartPeriodChange={onBitcoinChartPeriodChange}
          chartLoading={bitcoin.chartLoading && bitcoin.chartData.length === 0}
          chartPending={bitcoin.chartPending}
          chartError={!!bitcoin.error && bitcoin.chartData.length === 0}
          coinInfo={bitcoin.coinInfo}
          marketData={bitcoin.marketData}
          infoLoading={bitcoin.infoLoading && !bitcoin.coinInfo}
          bleed={spacing.screenGutter}
        />
      ) : balanceState === 'loading' || tokens.length > 0 ? (
        <>
          <TokenList
            tokens={tokens}
            loading={balanceState === 'loading'}
            onTokenPress={onTokenPress}
            hiddenBalance={hiddenBalance}
            blockchain={getBlockchainFromNetworkId(currentNetworkId)}
          />
          {/* The price provider's credit closes the list (its terms: once
              per screen that shows its prices). */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <DataAttribution networkId={currentNetworkId} />
          </div>
        </>
      ) : balanceState === 'error' ? (
        /* A failed load with nothing cached is an error state, never "No
           tokens found" and never an endless skeleton — PRODUCT.md keeps
           those answers distinct. */
        <StateBlock
          tone="error"
          testID="token-list-error"
          retryTestID="token-list-retry-button"
          title={t('wallet.tokens_load_error', "Your tokens couldn't be loaded right now.")}
          onRetry={onRetry}
          retryLabel={t('actions.retry', 'Retry')}
        />
      ) : (
        <StateBlock
          tone="empty"
          title={t('wallet.no_tokens_found', 'No tokens found')}
          body={t(
            'wallet.tokens_empty_subtitle',
            'Your tokens will appear here once you receive some'
          )}
        />
      )}
    </div>
  );
}
