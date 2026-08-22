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
import { SwapDetailsCard } from '../SwapScreen/SwapDetailsCard';
import { SwapReviewExchange } from '../SwapScreen/SwapReviewExchange';
import { SwapReviewButtons } from '../SwapScreen/SwapReviewButtons';
import { useTabChrome } from '../../../hooks/useTabChrome';
import type { BridgeReviewScreenProps } from './types';

/**
 * BridgeReviewScreen - Third step of bridge flow
 * Shows bridge details and confirm/back buttons
 * Reuses SwapDetailsCard and SwapReviewExchange components from SwapScreen
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
        {/* Exchange graphic: sent token → arrow → received token */}
        <View style={styles.cardsContainer}>
          <SwapReviewExchange
            send={{
              label: t('swap.you_send', 'You Send'),
              logo: inToken.logo,
              symbol: inToken.symbol,
              amount: formatAmountWithSymbol(inAmount, inToken.symbol),
            }}
            receive={{
              label: t('bridge.review.youReceiveEstimated', 'You Receive (estimated)'),
              logo: outToken.logo,
              symbol: outToken.symbol,
              amount: formatAmountWithSymbol(outAmount, outToken.symbol),
              pendingAmount: isRefreshing,
            }}
          />
        </View>

        {/* Details Section — one grouped card, same treatment as the swap
            review (no disclosure: every bridge row is commit-relevant). */}
        <SwapDetailsCard
          style={styles.detailsContainer}
          rows={[
            {
              label: t('bridge.review.recipient', 'Recipient'),
              value: getShortAddress(recipientAddress, 8) ?? '',
            },
            {
              label: t('bridge.review.fromNetwork', 'From Network'),
              value: inToken.network || 'Solana',
            },
            {
              label: t('bridge.review.toNetwork', 'To Network'),
              value: outToken.network || t('transactions.unknown'),
            },
            ...(estimate
              ? [
                  {
                    label: t('bridge.review.minimumAmount', 'Minimum Amount'),
                    value: formatAmountWithSymbol(estimate.minAmount, inToken.symbol),
                    pending: isRefreshing,
                  },
                  {
                    label: t('bridge.review.estimatedOutput', 'Estimated Output'),
                    value: formatAmountWithSymbol(estimate.estimatedAmount, outToken.symbol),
                    pending: isRefreshing,
                  },
                ]
              : []),
            // The swap names its cut ("Salmon fee"); the bridge netted 0.4%
            // into the estimate above and said nothing. Same cut, same row.
            {
              label: t('bridge.review.salmonFee', 'Salmon fee'),
              value: formatPercent(BRIDGE_PARTNER_FEE_PERCENT),
            },
            { label: t('bridge.review.provider', 'Provider'), value: 'StealthEX' },
          ]}
        />

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
              'Cross-chain transfers typically take 10-30 minutes to complete. You will receive a deposit address after confirmation. The estimated amount above already has the Salmon fee deducted.'
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
    fontSize: ms(fontSize.headline),
    fontFamily: fontFamilyNative.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: letterSpacing.snug,
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
    marginBottom: vs(spacing['2xl']),
  },
  dangerBox: {
    backgroundColor: semantic.status.dangerTint,
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
    backgroundColor: semantic.status.warningTint,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.thin,
    borderColor: semantic.status.warningTintBorder,
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
