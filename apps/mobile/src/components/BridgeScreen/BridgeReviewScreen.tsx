import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  borderWidth,
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
  formatAmountWithSymbol,
  formatPercent,
  getShortAddress,
  semantic,
  BRIDGE_PARTNER_FEE_PERCENT,
} from '@salmon/shared';
import { SwapDetailRow } from '../SwapScreen/SwapDetailRow';
import { SwapReviewCard } from '../SwapScreen/SwapReviewCard';
import { SwapReviewButtons } from '../SwapScreen/SwapReviewButtons';
import { useTabChrome } from '../../../hooks/useTabChrome';
import type { BridgeReviewScreenProps } from './types';

/**
 * BridgeReviewScreen - Third step of bridge flow
 * Shows bridge details and confirm/back buttons
 * Reuses SwapDetailRow and SwapReviewCard components from SwapScreen
 */
export const BridgeReviewScreen: React.FC<BridgeReviewScreenProps> = ({
  inToken,
  outToken,
  inAmount,
  outAmount,
  recipientAddress,
  estimate,
  onBack,
  onConfirm,
  isConfirming = false,
  isRefreshing = false,
  confirmLabel,
  style,
}) => {
  const { t } = useTranslation();
  const { floatingBottomOffset } = useTabChrome();

  return (
    <View style={[styles.container, { paddingBottom: floatingBottomOffset }, style]}>
      {/* Title */}
      <Text style={styles.title}>{t('bridge.review.title', 'Bridge Review')}</Text>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Send/Receive Cards */}
        <View style={styles.cardsContainer}>
          <SwapReviewCard
            label={t('swap.you_send', 'You Send')}
            amount={formatAmountWithSymbol(inAmount, inToken.symbol)}
          />
          <SwapReviewCard
            label={t('bridge.review.youReceiveEstimated', 'You Receive (estimated)')}
            amount={formatAmountWithSymbol(outAmount, outToken.symbol)}
            pendingAmount={isRefreshing}
          />
        </View>

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          <SwapDetailRow
            label={t('bridge.review.recipient', 'Recipient')}
            value={getShortAddress(recipientAddress, 8) ?? ''}
          />
          <SwapDetailRow
            label={t('bridge.review.fromNetwork', 'From Network')}
            value={inToken.network || 'Solana'}
          />
          <SwapDetailRow
            label={t('bridge.review.toNetwork', 'To Network')}
            value={outToken.network || t('transactions.unknown')}
          />
          {estimate && (
            <>
              <SwapDetailRow
                label={t('bridge.review.minimumAmount', 'Minimum Amount')}
                value={formatAmountWithSymbol(estimate.minAmount, inToken.symbol)}
                pending={isRefreshing}
              />
              <SwapDetailRow
                label={t('bridge.review.estimatedOutput', 'Estimated Output')}
                value={formatAmountWithSymbol(estimate.estimatedAmount, outToken.symbol)}
                pending={isRefreshing}
              />
            </>
          )}
          {/* The swap names its cut ("Salmon fee"); the bridge netted 0.4%
              into the estimate above and said nothing. Same cut, same row. */}
          <SwapDetailRow
            label={t('bridge.review.salmonFee', 'Salmon fee')}
            value={formatPercent(BRIDGE_PARTNER_FEE_PERCENT)}
          />
          <SwapDetailRow label={t('bridge.review.provider', 'Provider')} value="StealthEX" />
        </View>

        {/* The swap warns about irreversibility on the flow that settles in
            thirteen seconds; the bridge, which genuinely cannot be stopped,
            warned only about duration. This is the commit point, so the thing
            that cannot be undone is stated here. */}
        <View style={styles.dangerBox} testID="bridge-irreversible-notice">
          <Text style={styles.dangerTitle}>
            {t('bridge.review.irreversible', 'This cannot be undone')}
          </Text>
          <Text style={styles.warningText}>
            {t(
              'bridge.review.irreversibleText',
              'Confirming sends your funds to StealthEX, which holds them until the cross-chain transfer completes. Once confirmed there is no cancel and no way to reverse or recover the transfer — not by Salmon and not by you.'
            )}
          </Text>
        </View>

        {/* Warning Box */}
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>{t('bridge.review.pleaseNote', 'Please Note')}</Text>
          <Text style={styles.warningText}>
            {t(
              'bridge.review.pleaseNoteText',
              'Cross-chain swaps typically take 10-30 minutes to complete. You will receive a deposit address after confirmation. The estimated amount above already has the Salmon fee deducted.'
            )}
          </Text>
        </View>
      </ScrollView>

      {/* Buttons */}
      <SwapReviewButtons
        onBack={onBack}
        onConfirm={onConfirm}
        isConfirming={isConfirming}
        isRefreshing={isRefreshing}
        confirmLabel={confirmLabel ?? t('bridge.review.confirmSwap', 'Confirm Bridge')}
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
  title: {
    fontSize: ms(fontSize['2xl']),
    fontFamily: fontFamilyNative.bold,
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
    marginBottom: vs(spacing['2xl']),
  },
  dangerBox: {
    backgroundColor: colors.status.errorBackground,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.thin,
    borderColor: semantic.status.danger,
    padding: s(spacing.base),
    marginBottom: vs(spacing.md),
  },
  dangerTitle: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: semantic.status.danger,
    marginBottom: vs(spacing.xs),
    letterSpacing: letterSpacing.normal,
  },
  warningBox: {
    backgroundColor: colors.status.warningBackground,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.thin,
    borderColor: colors.status.warningBorder,
    padding: s(spacing.base),
    marginBottom: vs(spacing.lg),
  },
  warningTitle: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: semantic.status.warning,
    marginBottom: vs(spacing.xs),
    letterSpacing: letterSpacing.normal,
  },
  warningText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(fontSize.sm * lineHeight.normal),
  },
});

export default BridgeReviewScreen;
