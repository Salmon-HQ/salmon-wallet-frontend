/**
 * SwapRouteVisualization - Expandable visualization of swap routes
 *
 * Migrated from packages/ui (React Native) to MUI styled components.
 * Uses CSS transitions instead of react-native-reanimated for expand/collapse.
 *
 * Shows the path a swap took through different DEXes and tokens.
 */

import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  QuestionIcon,
  TreeStructureIcon,
  iconSize,
} from '../../icons';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  borderRadius,
  colors,
  copyToClipboard,
  formatBlockNumber,
  formatDateTime,
  formatRawAmount,
  getShortAddress,
  semantic,
  spacing,
  truncateHash,
  fontSize,
  fontWeight,
  letterSpacing,
  opacity,
  componentSizes,
  duration,
  easing,
  tabularNums,
  useCopyFeedback,
} from '@salmon/shared';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import { ConversionRateDisplay } from './ConversionRateDisplay';
import { PriceImpactBadge } from './PriceImpactBadge';
import type { SwapRouteHop, SwapRouteVisualizationProps, Transaction } from './types';

import { CopyTick } from '../CopyTick';
// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  overflow: 'hidden',
  transition: `max-height ${duration.slow} ${easing.standard}, opacity ${duration.slow} ${easing.ease}`,
});

const Content = styled(Box)({
  paddingTop: spacing.sm,
  paddingBottom: spacing.xs,
  paddingLeft: spacing.xs,
  paddingRight: spacing.xs,
});

const RouteContainer = styled(Box)({
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.md,
  padding: spacing.sm,
});

const RouteHeader = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  marginBottom: spacing.sm,
});

const RouteHeaderText = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
});

const SimpleRoute = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
});

const RouteColumn = styled(Box)({
  flex: 1,
});

const RouteLabel = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: colors.text.tertiary,
  marginBottom: spacing.xs,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.wider,
});

const RouteTokenRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  marginBottom: spacing.xxs,
});

const RouteTokenText = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  color: colors.text.primary,
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const RouteArrowColumn = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  padding: `${spacing.lg}px ${spacing.sm}px 0`,
});

const MoreText = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.xs,
  color: colors.text.tertiary,
  marginTop: spacing.xxs,
});

const RouteSummary = styled(Box)({
  borderTop: `1px solid ${colors.border.subtle}`,
  paddingTop: spacing.xs,
  marginTop: spacing.xxs,
});

const SummaryRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: spacing.sm,
});

const SummaryLabel = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.tertiary,
});

const SummaryValue = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
});

const TokenIconImg = styled('img')({
  borderRadius: '50%',
  backgroundColor: colors.background.card,
  objectFit: 'cover',
});

const TokenIconPlaceholder = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  backgroundColor: colors.background.card,
});

const HopContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: spacing.xs,
});

const HopToken = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  flex: 1,
  minWidth: 0,
});

const HopAmount = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  color: colors.text.primary,
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const HopArrow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  padding: `0 ${spacing.sm}px`,
});

const DexBadge = styled(Box)({
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  backgroundColor: colors.background.tokenItem,
  padding: `${spacing.xxs}px ${spacing.xs}px`,
  borderRadius: borderRadius.sm,
});

const DexText = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
});

const PercentText = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.xs,
  color: colors.text.tertiary,
});

const HashCopyContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  cursor: 'pointer',
  '&:hover': {
    opacity: opacity.medium,
  },
});

// ============================================================================
// Sub-components
// ============================================================================

const TokenIcon: React.FC<{ uri?: string | null; size?: number }> = ({
  uri,
  size = componentSizes.iconSizeMedium,
}) => {
  if (uri) {
    return <TokenIconImg src={uri} alt="" style={{ width: size, height: size }} />;
  }

  return (
    <TokenIconPlaceholder style={{ width: size, height: size }}>
      <QuestionIcon size={size * 0.6} color={colors.text.tertiary} />
    </TokenIconPlaceholder>
  );
};

const HashCopyRow: React.FC<{
  label: string;
  value: string;
  displayValue?: string;
}> = ({ label, value, displayValue }) => {
  const { copied, trigger: showCopied } = useCopyFeedback();

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(value);
      showCopied();
    } catch (error) {
      console.warn('Failed to copy:', error);
    }
  }, [value, showCopied]);

  return (
    <SummaryRow>
      <SummaryLabel>{label}</SummaryLabel>
      <HashCopyContainer onClick={handleCopy}>
        <SummaryValue>{displayValue ?? value}</SummaryValue>
        <CopyTick
          copied={copied}
          copy={<CopyIcon size={iconSize.sm} color={colors.text.tertiary} />}
          tick={<CheckIcon size={iconSize.sm} color={semantic.status.success} />}
        />
      </HashCopyContainer>
    </SummaryRow>
  );
};

const RouteHop: React.FC<{ hop: SwapRouteHop; isLast: boolean }> = ({ hop, isLast }) => {
  return (
    <HopContainer>
      <HopToken>
        <TokenIcon uri={hop.inputToken.logo} size={20} />
        <HopAmount>
          {formatRawAmount(hop.inputToken.amount, hop.inputToken.decimals)} {hop.inputToken.symbol}
        </HopAmount>
      </HopToken>

      <HopArrow>
        <DexBadge>
          <DexText>{hop.dex}</DexText>
          {hop.percent < 100 && <PercentText>{hop.percent}%</PercentText>}
        </DexBadge>
        <ArrowRightIcon size={iconSize.sm} color={colors.text.secondary} />
      </HopArrow>

      {isLast && (
        <HopToken>
          <TokenIcon uri={hop.outputToken.logo} size={20} />
          <HopAmount>
            {formatRawAmount(hop.outputToken.amount, hop.outputToken.decimals)}{' '}
            {hop.outputToken.symbol}
          </HopAmount>
        </HopToken>
      )}
    </HopContainer>
  );
};

// ============================================================================
// Route Views
// ============================================================================

const TransactionSummaryRows: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const { t } = useTranslation();
  const { fee, slot, id, timestamp, swapRoute } = transaction;

  const conversionRate = useMemo(() => {
    if (swapRoute?.conversionRate) return swapRoute.conversionRate;
    if (transaction.outputs.length === 1 && transaction.inputs.length === 1) {
      const fromToken = transaction.outputs[0];
      const toToken = transaction.inputs[0];
      const fromAmount = parseFloat(fromToken.amount) / Math.pow(10, fromToken.decimals);
      const toAmount = parseFloat(toToken.amount) / Math.pow(10, toToken.decimals);
      if (fromAmount > 0) {
        return {
          fromSymbol: fromToken.symbol,
          toSymbol: toToken.symbol,
          rate: (toAmount / fromAmount).toFixed(6),
        };
      }
    }
    return null;
  }, [swapRoute, transaction.outputs, transaction.inputs]);

  return (
    <RouteSummary>
      {swapRoute?.priceImpact && (
        <SummaryRow>
          <SummaryLabel>{t('transactions.detail.priceImpact')}</SummaryLabel>
          <PriceImpactBadge value={swapRoute.priceImpact} size="small" showIcon />
        </SummaryRow>
      )}

      {conversionRate && (
        <SummaryRow>
          <SummaryLabel>{t('transactions.detail.rate')}</SummaryLabel>
          <ConversionRateDisplay
            fromSymbol={conversionRate.fromSymbol}
            toSymbol={conversionRate.toSymbol}
            rate={conversionRate.rate}
            size="small"
          />
        </SummaryRow>
      )}

      {swapRoute?.totalFee && (
        <SummaryRow>
          <SummaryLabel>{t('transactions.detail.totalFees')}</SummaryLabel>
          <SummaryValue>
            {swapRoute.totalFee.amount} {swapRoute.totalFee.symbol}
          </SummaryValue>
        </SummaryRow>
      )}

      {!swapRoute?.totalFee && fee && (
        <SummaryRow>
          <SummaryLabel>{t('transactions.detail.networkFee')}</SummaryLabel>
          <SummaryValue>
            {(fee.amount / Math.pow(10, fee.decimals)).toFixed(6)} {fee.symbol}
          </SummaryValue>
        </SummaryRow>
      )}

      {slot != null && (
        <SummaryRow>
          <SummaryLabel>{t('transactions.detail.block')}</SummaryLabel>
          <SummaryValue>#{formatBlockNumber(slot)}</SummaryValue>
        </SummaryRow>
      )}

      {timestamp != null && (
        <SummaryRow>
          <SummaryLabel>{t('transactions.detail.time')}</SummaryLabel>
          <SummaryValue>{formatDateTime(timestamp)}</SummaryValue>
        </SummaryRow>
      )}

      {id && (
        <HashCopyRow
          label={t('transactions.detail.txHash')}
          value={id}
          displayValue={truncateHash(id)}
        />
      )}

      {transaction.feePayer && (
        <SummaryRow>
          <SummaryLabel>{t('transactions.detail.feePayer')}</SummaryLabel>
          <SummaryValue>{getShortAddress(transaction.feePayer, 4)}</SummaryValue>
        </SummaryRow>
      )}

      {transaction.accountsInvolved != null && transaction.accountsInvolved > 0 && (
        <SummaryRow>
          <SummaryLabel>{t('transactions.detail.accounts')}</SummaryLabel>
          <SummaryValue>{transaction.accountsInvolved}</SummaryValue>
        </SummaryRow>
      )}

      {transaction.instructions && transaction.instructions.length > 0 && (
        <SummaryRow>
          <SummaryLabel>{t('transactions.detail.programs')}</SummaryLabel>
          <SummaryValue>{transaction.instructions.length}</SummaryValue>
        </SummaryRow>
      )}

      {transaction.swapFees?.nativeFees && transaction.swapFees.nativeFees.length > 0 && (
        <SummaryRow>
          <SummaryLabel>{t('transactions.detail.swapFeesNative')}</SummaryLabel>
          <SummaryValue>
            {t('transactions.detail.feeCount', { count: transaction.swapFees.nativeFees.length })}
          </SummaryValue>
        </SummaryRow>
      )}

      {transaction.innerSwaps && transaction.innerSwaps.length > 0 && (
        <SummaryRow>
          <SummaryLabel>{t('transactions.detail.routeHops')}</SummaryLabel>
          <SummaryValue>
            {t('transactions.detail.hopCount', { count: transaction.innerSwaps.length })}
          </SummaryValue>
        </SummaryRow>
      )}
    </RouteSummary>
  );
};

const SimpleRouteView: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const { t } = useTranslation();
  const { inputs, outputs, source } = transaction;

  return (
    <RouteContainer>
      <RouteHeader>
        <TreeStructureIcon size={iconSize.sm} color={colors.text.secondary} />
        <RouteHeaderText>
          {t('transactions.detail.route')}
          {source ? ` ${t('transactions.detail.viaSource', { source })}` : ''}
        </RouteHeaderText>
      </RouteHeader>

      <SimpleRoute>
        <RouteColumn>
          <RouteLabel>{t('transactions.detail.sentLabel')}</RouteLabel>
          {outputs.slice(0, 3).map((output, i) => (
            <RouteTokenRow key={`out-${i}`}>
              <TokenIcon uri={output.logo} size={18} />
              <RouteTokenText>
                {formatRawAmount(output.amount, output.decimals)} {output.symbol}
              </RouteTokenText>
            </RouteTokenRow>
          ))}
          {outputs.length > 3 && (
            <MoreText>{t('transactions.detail.nMore', { count: outputs.length - 3 })}</MoreText>
          )}
        </RouteColumn>

        <RouteArrowColumn>
          <ArrowRightIcon size={iconSize.md} color={colors.accent.primary} />
        </RouteArrowColumn>

        <RouteColumn>
          <RouteLabel>{t('transactions.detail.receivedLabel')}</RouteLabel>
          {inputs.slice(0, 3).map((input, i) => (
            <RouteTokenRow key={`in-${i}`}>
              <TokenIcon uri={input.logo} size={18} />
              <RouteTokenText>
                {formatRawAmount(input.amount, input.decimals)} {input.symbol}
              </RouteTokenText>
            </RouteTokenRow>
          ))}
          {inputs.length > 3 && (
            <MoreText>{t('transactions.detail.nMore', { count: inputs.length - 3 })}</MoreText>
          )}
        </RouteColumn>
      </SimpleRoute>

      <TransactionSummaryRows transaction={transaction} />
    </RouteContainer>
  );
};

const DetailedRouteView: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const { t } = useTranslation();
  const { swapRoute, source } = transaction;

  if (!swapRoute || swapRoute.hops.length === 0) {
    return <SimpleRouteView transaction={transaction} />;
  }

  return (
    <RouteContainer>
      <RouteHeader>
        <TreeStructureIcon size={iconSize.sm} color={colors.text.secondary} />
        <RouteHeaderText>
          {t('transactions.detail.route')}
          {source ? ` ${t('transactions.detail.viaSource', { source })}` : ''} (
          {t('transactions.detail.hopCount', { count: swapRoute.hops.length })})
        </RouteHeaderText>
      </RouteHeader>

      <Box sx={{ mb: `${spacing.xs}px` }}>
        {swapRoute.hops.map((hop, index) => (
          <RouteHop key={`hop-${index}`} hop={hop} isLast={index === swapRoute.hops.length - 1} />
        ))}
      </Box>

      <TransactionSummaryRows transaction={transaction} />
    </RouteContainer>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function SwapRouteVisualization({ transaction, expanded }: SwapRouteVisualizationProps) {
  if (transaction.type !== 'swap') {
    return null;
  }

  return (
    <Container
      sx={{
        maxHeight: expanded ? 800 : 0,
        opacity: expanded ? 1 : 0,
        pointerEvents: expanded ? 'auto' : 'none',
      }}
    >
      <Content>
        {transaction.swapRoute ? (
          <DetailedRouteView transaction={transaction} />
        ) : (
          <SimpleRouteView transaction={transaction} />
        )}
      </Content>
    </Container>
  );
}
