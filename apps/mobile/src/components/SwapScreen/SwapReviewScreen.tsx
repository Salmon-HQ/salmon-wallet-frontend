import {
  borderRadius,
  colors,
  componentSizes,
  fontSize,
  fontFamilyNative,
  formatAmountWithSymbol,
  formatSolFee,
  formatPercent,
  letterSpacing,
  lineHeight,
  ms,
  opacity,
  s,
  spacing,
  useCurrencyContext,
  vs,
  semantic,
} from '@salmon/shared';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BlurContainer } from '../BlurContainer';
import { SwapDetailRow } from './SwapDetailRow';
import { SwapReviewCard } from './SwapReviewCard';
import { SwapReviewButtons } from './SwapReviewButtons';
import { useTabChrome } from '../../../hooks/useTabChrome';
import type { SwapReviewScreenProps } from './types';

/**
 * SwapReviewScreen - Second step of swap flow
 * Shows quote details and confirm/back buttons
 */
export const SwapReviewScreen: React.FC<SwapReviewScreenProps> = ({
  quote,
  inToken,
  outToken,
  inAmount,
  outAmount,
  onBack,
  onConfirm,
  isConfirming = false,
  isRefreshing = false,
  confirmLabel,
  style,
}) => {
  const { t } = useTranslation();
  const { floatingBottomOffset } = useTabChrome();
  const [, { formatValue }] = useCurrencyContext();
  const formatUsd = (value: number | undefined): string | undefined =>
    value != null ? `~${formatValue(value)}` : undefined;

  // Extract data from backend response structure (custom contains all swap details)
  const { input, output, fee, routeNames, custom: details } = quote;

  // Derive display values with fallbacks when quote.input/output are missing
  const inDecimals = input?.decimals ?? inToken.decimals;
  const outDecimals = output?.decimals ?? outToken.decimals;
  const inSymbol = input?.symbol ?? inToken.symbol;
  const outSymbol = output?.symbol ?? outToken.symbol;

  const displayInAmount =
    input?.amount != null
      ? Number(input.amount) / 10 ** inDecimals
      : parseFloat(inAmount || '0') || 0;
  const displayOutAmount =
    output?.amount != null
      ? Number(output.amount) / 10 ** outDecimals
      : parseFloat(outAmount || '0') || 0;

  return (
    <View style={[styles.container, { paddingBottom: floatingBottomOffset }, style]}>
      {/* Background Pattern - subtle swap graphic */}
      <View style={styles.backgroundPattern}>
        {/* This would be the swap background image from Figma */}
      </View>

      {/* Title */}
      <Text style={styles.title}>{t('swap.review.title', 'Swap Review')}</Text>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Send/Receive Cards */}
        <View style={styles.cardsContainer}>
          {/* The amount being sent is what the user typed: a new quote cannot
              change it, so it never reports loading. Its dollar value can, and
              so can everything on the receive side. */}
          <SwapReviewCard
            label={t('swap.you_send', 'You Send')}
            amount={formatAmountWithSymbol(displayInAmount, inSymbol)}
            usdValue={formatUsd(details?.inUsdValue)}
            pendingUsdValue={isRefreshing}
          />
          <SwapReviewCard
            label={t('swap.you_receive', 'You Receive')}
            amount={formatAmountWithSymbol(displayOutAmount, outSymbol)}
            usdValue={formatUsd(details?.outUsdValue)}
            pendingAmount={isRefreshing}
            pendingUsdValue={isRefreshing}
          />
        </View>

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          {fee && (
            <SwapDetailRow
              label={t('swap.review.salmonFee', 'Salmon fee')}
              value={formatPercent(fee.percent)}
            />
          )}
          {details?.router && (
            <SwapDetailRow label={t('swap.router', 'Router')} value={details.router} />
          )}
          {routeNames && routeNames.length > 0 && (
            <SwapDetailRow
              label={t('swap.review.route', 'Route')}
              value={routeNames.join(' → ')}
              pending={isRefreshing}
            />
          )}
          {details?.gasless && (
            <SwapDetailRow label={t('swap.gasless', 'Gasless')} value={t('swap.yes', 'Yes')} />
          )}
          {details?.prioritizationFeeLamports != null && (
            <SwapDetailRow
              label={t('swap.priority_fee', 'Priority Fee')}
              value={formatSolFee(details.prioritizationFeeLamports)}
              pending={isRefreshing}
            />
          )}
          {details?.rentFeeLamports != null && (
            <SwapDetailRow
              label={t('swap.rent_fee', 'Rent Fee')}
              value={formatSolFee(details.rentFeeLamports)}
              pending={isRefreshing}
            />
          )}
          {details?.slippageBps != null && (
            <SwapDetailRow
              label={t('swap.slippage_tolerance', 'Slippage Tolerance')}
              value={formatPercent(details.slippageBps / 100)}
            />
          )}
          {details?.otherAmountThreshold != null && (
            <SwapDetailRow
              label={t('swap.minimum_received', 'Minimum Received')}
              value={formatAmountWithSymbol(
                Number(details.otherAmountThreshold) / 10 ** outDecimals,
                outSymbol
              )}
              pending={isRefreshing}
            />
          )}
          {details?.swapMode && (
            <SwapDetailRow label={t('swap.swap_mode', 'Swap Mode')} value={details.swapMode} />
          )}
          {details?.priceImpact != null && (
            <SwapDetailRow
              label={t('swap.review.totalPriceImpact', 'Total Price Impact')}
              value={formatPercent(details.priceImpact)}
              pending={isRefreshing}
            />
          )}
        </View>

        {/* Warning Box */}
        <BlurContainer
          borderColor={colors.palette.amber}
          backgroundColor={colors.status.warningBackground}
          style={styles.warningBox}
        >
          <Text style={styles.warningTitle}>{t('swap.review.pleaseNote', 'Please Note')}</Text>
          <Text style={styles.warningText}>
            {t(
              'swap.review.pleaseNoteText',
              'Swap rates are estimates. The actual amount you receive may differ due to slippage and market conditions. Transactions are irreversible once confirmed.'
            )}
          </Text>
        </BlurContainer>
      </ScrollView>

      {/* Buttons */}
      <SwapReviewButtons
        onBack={onBack}
        onConfirm={onConfirm}
        isConfirming={isConfirming}
        isRefreshing={isRefreshing}
        confirmLabel={confirmLabel ?? t('swap.review.confirmSwap', 'Confirm')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: s(spacing.headerPadding),
    paddingTop: vs(spacing['2xl']),
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: vs(componentSizes.chartHeight),
    opacity: opacity.faint,
  },
  title: {
    fontSize: ms(fontSize['2xl']),
    fontFamily: fontFamilyNative.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: letterSpacing.wide,
    lineHeight: ms(24 * lineHeight.condensed),
    marginBottom: vs(spacing['2xl']),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: vs(spacing['4xl']),
  },
  cardsContainer: {
    gap: vs(spacing.md),
    marginBottom: vs(spacing['2xl']),
  },
  detailsContainer: {
    gap: vs(spacing.md - 3),
    marginBottom: vs(spacing['3xl']),
  },
  warningBox: {
    borderRadius: borderRadius.md,
    padding: s(spacing.base),
    marginBottom: vs(spacing.lg),
  },
  warningTitle: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.status.warning,
    marginBottom: vs(spacing.xs),
    letterSpacing: letterSpacing.normal,
  },
  warningText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
    lineHeight: ms(12 * lineHeight.normal),
    letterSpacing: letterSpacing.normal,
  },
});

export default SwapReviewScreen;
