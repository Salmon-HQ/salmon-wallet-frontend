import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { timing } from '../../utils/motion';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from '../../utils/haptics';
import {
  borderRadius,
  colors,
  fontFamilyNative,
  fontSize,
  formatBlockNumber,
  formatDateTime,
  formatRawAmount,
  getShortAddress,
  letterSpacing,
  motionMs,
  ms,
  s,
  semantic,
  spacing,
  truncateHash,
  useCopyFeedback,
  vs,
} from '@salmon/shared';
import type { Transaction, SwapRouteHop } from './types';
import { TokenLogo } from '../TokenLogo';
import { PriceImpactBadge } from './PriceImpactBadge';
import { ConversionRateDisplay } from './ConversionRateDisplay';

// ============================================================================
// Constants
// ============================================================================



// ============================================================================
// Helper Functions
// ============================================================================

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Copyable hash/text row component
 */
const HashCopyRow: React.FC<{
  label: string;
  value: string;
  displayValue?: string;
}> = ({ label, value, displayValue }) => {
  const { t } = useTranslation();
  const { copied, trigger: showCopied } = useCopyFeedback();

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(value);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showCopied();
    } catch (error) {
      console.warn('Failed to copy:', error);
    }
  }, [value, showCopied]);

  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <TouchableOpacity
        onPress={handleCopy}
        style={styles.hashCopyContainer}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={t('transactions.detail.copyTransactionHash')}
      >
        <Text style={styles.summaryValue} numberOfLines={1}>
          {displayValue ?? value}
        </Text>
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={12}
          color={copied ? semantic.status.success : colors.text.tertiary}
          style={styles.copyIcon}
        />
      </TouchableOpacity>
    </View>
  );
};

/**
 * Route hop visualization
 */
const RouteHop: React.FC<{ hop: SwapRouteHop; isLast: boolean }> = ({ hop, isLast }) => {
  return (
    <View style={styles.hopContainer}>
      {/* Input token */}
      <View style={styles.hopToken}>
        <TokenLogo
          uri={hop.inputToken.logo || undefined}
          symbol={hop.inputToken.symbol}
          size={20}
        />
        <Text style={styles.hopAmount} numberOfLines={1}>
          {formatRawAmount(hop.inputToken.amount, hop.inputToken.decimals, 0.0001)}{' '}
          {hop.inputToken.symbol}
        </Text>
      </View>

      {/* Arrow with DEX label */}
      <View style={styles.hopArrow}>
        <View style={styles.dexBadge}>
          <Text style={styles.dexText}>{hop.dex}</Text>
          {hop.percent < 100 && <Text style={styles.percentText}>{hop.percent}%</Text>}
        </View>
        <Ionicons name="arrow-forward" size={14} color={colors.text.secondary} />
      </View>

      {/* Output token (only show on last hop or if different from next input) */}
      {isLast && (
        <View style={styles.hopToken}>
          <TokenLogo
            uri={hop.outputToken.logo || undefined}
            symbol={hop.outputToken.symbol}
            size={20}
          />
          <Text style={styles.hopAmount} numberOfLines={1}>
            {formatRawAmount(hop.outputToken.amount, hop.outputToken.decimals, 0.0001)}{' '}
            {hop.outputToken.symbol}
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * Fallback route visualization when no detailed route data
 */
const SimpleRouteView: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const { t } = useTranslation();
  const { inputs, outputs, source, fee, slot, id, timestamp, swapRoute } = transaction;

  // Calculate conversion rate if not provided but we have input/output data
  const conversionRate = useMemo(() => {
    if (swapRoute?.conversionRate) return swapRoute.conversionRate;
    if (outputs.length === 1 && inputs.length === 1) {
      const fromToken = outputs[0];
      const toToken = inputs[0];
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
  }, [swapRoute, outputs, inputs]);

  return (
    <View style={styles.simpleRouteContainer}>
      {/* Route header */}
      <View style={styles.routeHeader}>
        <Ionicons name="git-branch-outline" size={16} color={colors.text.secondary} />
        <Text style={styles.routeHeaderText}>
          {t('transactions.detail.route')}
          {source ? ` ${t('transactions.detail.viaSource', { source })}` : ''}
        </Text>
      </View>

      {/* Visual route */}
      <View style={styles.simpleRoute}>
        {/* Outputs (sent) */}
        <View style={styles.routeColumn}>
          <Text style={styles.routeLabel}>{t('transactions.detail.sentLabel')}</Text>
          {outputs.slice(0, 3).map((output, i) => (
            <View key={`out-${i}`} style={styles.routeTokenRow}>
              <TokenLogo uri={output.logo || undefined} symbol={output.symbol} size={18} />
              <Text style={styles.routeTokenText} numberOfLines={1}>
                {formatRawAmount(output.amount, output.decimals, 0.0001)} {output.symbol}
              </Text>
            </View>
          ))}
          {outputs.length > 3 && (
            <Text style={styles.moreText}>
              {t('transactions.detail.nMore', { count: outputs.length - 3 })}
            </Text>
          )}
        </View>

        {/* Arrow */}
        <View style={styles.routeArrowColumn}>
          <Ionicons name="arrow-forward" size={20} color={colors.accent.primary} />
        </View>

        {/* Inputs (received) */}
        <View style={styles.routeColumn}>
          <Text style={styles.routeLabel}>{t('transactions.detail.receivedLabel')}</Text>
          {inputs.slice(0, 3).map((input, i) => (
            <View key={`in-${i}`} style={styles.routeTokenRow}>
              <TokenLogo uri={input.logo || undefined} symbol={input.symbol} size={18} />
              <Text style={styles.routeTokenText} numberOfLines={1}>
                {formatRawAmount(input.amount, input.decimals, 0.0001)} {input.symbol}
              </Text>
            </View>
          ))}
          {inputs.length > 3 && (
            <Text style={styles.moreText}>
              {t('transactions.detail.nMore', { count: inputs.length - 3 })}
            </Text>
          )}
        </View>
      </View>

      {/* Summary section - unified with TransactionDetailModal */}
      <View style={styles.routeSummary}>
        {/* Price Impact */}
        {swapRoute?.priceImpact && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.priceImpact')}</Text>
            <PriceImpactBadge value={swapRoute.priceImpact} size="small" showIcon />
          </View>
        )}

        {/* Conversion Rate */}
        {conversionRate && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.rate')}</Text>
            <ConversionRateDisplay
              fromSymbol={conversionRate.fromSymbol}
              toSymbol={conversionRate.toSymbol}
              rate={conversionRate.rate}
              size="small"
            />
          </View>
        )}

        {/* Fee info */}
        {fee && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.networkFee')}</Text>
            <Text style={styles.summaryValue}>
              {(fee.amount / Math.pow(10, fee.decimals)).toFixed(6)} {fee.symbol}
            </Text>
          </View>
        )}

        {/* Block info */}
        {slot && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.block')}</Text>
            <Text style={styles.summaryValue}>#{formatBlockNumber(slot)}</Text>
          </View>
        )}

        {/* Timestamp */}
        {timestamp && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.time')}</Text>
            <Text style={styles.summaryValue}>{formatDateTime(timestamp)}</Text>
          </View>
        )}

        {/* Transaction Hash */}
        {id && (
          <HashCopyRow
            label={t('transactions.detail.txHash')}
            value={id}
            displayValue={truncateHash(id)}
          />
        )}

        {/* Fee Payer */}
        {transaction.feePayer && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.feePayer')}</Text>
            <Text style={styles.summaryValue}>{getShortAddress(transaction.feePayer, 4)}</Text>
          </View>
        )}

        {/* Accounts Involved */}
        {transaction.accountsInvolved && transaction.accountsInvolved > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.accounts')}</Text>
            <Text style={styles.summaryValue}>{transaction.accountsInvolved}</Text>
          </View>
        )}

        {/* Programs Used */}
        {transaction.instructions && transaction.instructions.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.programs')}</Text>
            <Text style={styles.summaryValue}>{transaction.instructions.length}</Text>
          </View>
        )}

        {/* Swap Fees (Native) */}
        {transaction.swapFees?.nativeFees && transaction.swapFees.nativeFees.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.swapFeesNative')}</Text>
            <Text style={styles.summaryValue}>
              {t('transactions.detail.feeCount', { count: transaction.swapFees.nativeFees.length })}
            </Text>
          </View>
        )}

        {/* Inner Swaps / Multi-hop */}
        {transaction.innerSwaps && transaction.innerSwaps.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.routeHops')}</Text>
            <Text style={styles.summaryValue}>
              {t('transactions.detail.hopCount', { count: transaction.innerSwaps.length })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

/**
 * Detailed route visualization with hops
 */
const DetailedRouteView: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const { t } = useTranslation();
  const { swapRoute, source, slot, fee, id, timestamp } = transaction;

  if (!swapRoute || swapRoute.hops.length === 0) {
    return <SimpleRouteView transaction={transaction} />;
  }

  return (
    <View style={styles.detailedRouteContainer}>
      {/* Route header */}
      <View style={styles.routeHeader}>
        <Ionicons name="git-branch-outline" size={16} color={colors.text.secondary} />
        <Text style={styles.routeHeaderText}>
          {t('transactions.detail.route')}
          {source ? ` ${t('transactions.detail.viaSource', { source })}` : ''} (
          {t('transactions.detail.hopCount', { count: swapRoute.hops.length })})
        </Text>
      </View>

      {/* Hops */}
      <View style={styles.hopsContainer}>
        {swapRoute.hops.map((hop, index) => (
          <RouteHop key={`hop-${index}`} hop={hop} isLast={index === swapRoute.hops.length - 1} />
        ))}
      </View>

      {/* Summary */}
      <View style={styles.routeSummary}>
        {swapRoute.priceImpact && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.priceImpact')}</Text>
            <PriceImpactBadge value={swapRoute.priceImpact} size="small" showIcon />
          </View>
        )}
        {swapRoute.conversionRate && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.rate')}</Text>
            <ConversionRateDisplay
              fromSymbol={swapRoute.conversionRate.fromSymbol}
              toSymbol={swapRoute.conversionRate.toSymbol}
              rate={swapRoute.conversionRate.rate}
              size="small"
            />
          </View>
        )}
        {swapRoute.totalFee && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.totalFees')}</Text>
            <Text style={styles.summaryValue}>
              {swapRoute.totalFee.amount} {swapRoute.totalFee.symbol}
            </Text>
          </View>
        )}
        {!swapRoute.totalFee && fee && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.networkFee')}</Text>
            <Text style={styles.summaryValue}>
              {(fee.amount / Math.pow(10, fee.decimals)).toFixed(6)} {fee.symbol}
            </Text>
          </View>
        )}
        {slot && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.block')}</Text>
            <Text style={styles.summaryValue}>#{formatBlockNumber(slot)}</Text>
          </View>
        )}
        {/* Timestamp */}
        {timestamp && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.time')}</Text>
            <Text style={styles.summaryValue}>{formatDateTime(timestamp)}</Text>
          </View>
        )}
        {/* Transaction Hash */}
        {id && (
          <HashCopyRow
            label={t('transactions.detail.txHash')}
            value={id}
            displayValue={truncateHash(id)}
          />
        )}

        {/* Fee Payer */}
        {transaction.feePayer && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.feePayer')}</Text>
            <Text style={styles.summaryValue}>{getShortAddress(transaction.feePayer, 4)}</Text>
          </View>
        )}

        {/* Accounts Involved */}
        {transaction.accountsInvolved && transaction.accountsInvolved > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.accounts')}</Text>
            <Text style={styles.summaryValue}>{transaction.accountsInvolved}</Text>
          </View>
        )}

        {/* Programs Used */}
        {transaction.instructions && transaction.instructions.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.programs')}</Text>
            <Text style={styles.summaryValue}>{transaction.instructions.length}</Text>
          </View>
        )}

        {/* Swap Fees (Native) */}
        {transaction.swapFees?.nativeFees && transaction.swapFees.nativeFees.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.swapFeesNative')}</Text>
            <Text style={styles.summaryValue}>
              {t('transactions.detail.feeCount', { count: transaction.swapFees.nativeFees.length })}
            </Text>
          </View>
        )}

        {/* Inner Swaps / Multi-hop */}
        {transaction.innerSwaps && transaction.innerSwaps.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('transactions.detail.routeHops')}</Text>
            <Text style={styles.summaryValue}>
              {t('transactions.detail.hopCount', { count: transaction.innerSwaps.length })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export interface SwapRouteVisualizationProps {
  transaction: Transaction;
  expanded: boolean;
}

/**
 * SwapRouteVisualization - Expandable visualization of swap routes
 *
 * Shows the path a swap took through different DEXes and tokens.
 * Animates smoothly when expanding/collapsing with dynamic height.
 */
export const SwapRouteVisualization: React.FC<SwapRouteVisualizationProps> = ({
  transaction,
  expanded,
}) => {
  if (transaction.type !== 'swap') {
    return null;
  }

  return <SwapRouteVisualizationContent transaction={transaction} expanded={expanded} />;
};

/**
 * Inner content component that safely uses all hooks unconditionally.
 */
const SwapRouteVisualizationContent: React.FC<SwapRouteVisualizationProps> = ({
  transaction,
  expanded,
}) => {
  // Track measured content height
  const contentHeight = useSharedValue(0);
  const [measured, setMeasured] = useState(false);

  // Handle content layout measurement
  const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && height !== contentHeight.value) {
      contentHeight.value = height;
      setMeasured(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contentHeight is a stable shared value ref
  }, []);

  const isReduceMotionEnabled = useReducedMotion();
  const expandTiming = timing(motionMs.drift, isReduceMotionEnabled);

  // Animated styles for expand/collapse with dynamic height
  const animatedStyle = useAnimatedStyle(() => {
    const targetHeight = expanded ? contentHeight.value : 0;
    // Expand/collapse is an in-place layout change: `drift`.
    const height = withTiming(targetHeight, expandTiming);
    const opacity = withTiming(expanded ? 1 : 0, expandTiming);

    return {
      height: measured ? height : expanded ? undefined : 0,
      opacity,
      overflow: 'hidden',
    };
  }, [expanded, measured, expandTiming]);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.content} onLayout={handleContentLayout}>
        {transaction.swapRoute ? (
          <DetailedRouteView transaction={transaction} />
        ) : (
          <SimpleRouteView transaction={transaction} />
        )}
      </View>
    </Animated.View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    paddingTop: vs(spacing.sm),
    paddingBottom: s(spacing.xs),
    paddingHorizontal: s(spacing.xs),
  },

  // Simple route styles
  simpleRouteContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: s(spacing.sm),
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
    marginBottom: vs(spacing.sm),
  },
  routeHeaderText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
  },
  simpleRoute: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  routeColumn: {
    flex: 1,
  },
  routeLabel: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.tertiary,
    marginBottom: vs(spacing.xs),
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wider,
  },
  routeTokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
    marginBottom: vs(spacing.xxs),
  },
  routeTokenText: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.primary,
    flex: 1,
  },
  routeArrowColumn: {
    paddingHorizontal: s(spacing.sm),
    paddingTop: vs(spacing.lg),
  },
  moreText: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.tertiary,
    marginTop: vs(spacing.xxs),
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
    marginTop: vs(spacing.sm),
    paddingTop: vs(spacing.xs),
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  feeText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.tertiary,
  },

  // Detailed route styles
  detailedRouteContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: s(spacing.sm),
  },
  hopsContainer: {
    marginBottom: vs(spacing.xs),
  },
  hopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(spacing.xs),
  },
  hopToken: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
    flex: 1,
  },
  hopAmount: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.primary,
    flex: 1,
  },
  hopArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
    paddingHorizontal: s(spacing.sm),
  },
  dexBadge: {
    backgroundColor: colors.background.tokenItem,
    paddingHorizontal: s(spacing.xs),
    paddingVertical: vs(spacing.xxs),
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
  },
  dexText: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
  },
  percentText: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.tertiary,
  },

  // Summary styles
  routeSummary: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: vs(spacing.xs),
    marginTop: vs(spacing.xxs),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(spacing.xs),
  },
  summaryLabel: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.tertiary,
  },
  summaryValue: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
  },
  summaryValueWarning: {
    color: semantic.status.warning,
  },

  // Hash copy row styles
  hashCopyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
  },
  copyIcon: {
    marginLeft: s(spacing.xxs),
  },
});

export default SwapRouteVisualization;
