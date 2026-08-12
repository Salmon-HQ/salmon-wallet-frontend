import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  useSwapScreenLogic,
  getTransactionUrl,
  getDefaultExplorer,
  useBridgeSettlement,
  colors,
  fontFamilyNative,
  fontSize,
  spacing,
} from '@salmon/shared';
import type { Blockchain, NetworkEnvironment, NetworkId } from '@salmon/shared';
import { useTranslation } from 'react-i18next';
import { SwapInputScreen } from './SwapInputScreen';
import { SwapReviewScreen } from './SwapReviewScreen';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import { TokenSelectorModal } from '../TokenSelector';
import { BridgeRecipientScreen } from '../BridgeScreen/BridgeRecipientScreen';
import { BridgeReviewScreen } from '../BridgeScreen/BridgeReviewScreen';
import { WarningNotice } from '../WarningNotice';
import type { SwapScreenProps } from './types';

/**
 * SwapScreen - Unified swap/bridge interface (React Native)
 *
 * Automatically detects whether to use:
 * - Jupiter: for same-chain Solana swaps
 * - StealthEX: for cross-chain bridges
 */
export const SwapScreen: React.FC<SwapScreenProps> = (props) => {
  const { style } = props;
  const { t } = useTranslation();

  const { trackBridgeExchange, isStalled, retryNow } = useBridgeSettlement();

  const logic = useSwapScreenLogic({
    ...props,
    onBridgeExchangeCreated: (exchange, context) => {
      // Hand the cross-chain exchange to the background poller; its destination
      // settles in minutes, so the success screen must not block on it.
      trackBridgeExchange({
        id: exchange.id,
        sourceNetworkId: context.sourceNetworkId as NetworkId | undefined,
        destNetworkId: context.destNetworkId as NetworkId | undefined,
        destAccountId: context.destinationAddress,
      });
    },
  });

  // Success renders from the confirm-time snapshot: post-swap balance
  // refreshes can drop the spent input token from the list and mutate the
  // live form state while the success screen is still mounted. Fall back to
  // live state only if the snapshot is missing (defensive).
  const summary = logic.successSummary;
  const successInLabel = summary
    ? `${summary.inAmount} ${summary.inSymbol}`
    : `${logic.inAmount} ${logic.inToken?.symbol ?? ''}`;
  const successOutLabel = summary
    ? `${summary.outAmount} ${summary.outSymbol}`
    : `${logic.outAmount} ${logic.outToken?.symbol ?? ''}`;
  const successOutSymbol = summary ? summary.outSymbol : (logic.outToken?.symbol ?? '');
  const successChain = summary ? summary.chain : logic.inToken?.chain;
  const successNetworkId = summary ? summary.networkId : logic.inToken?.networkId;

  return (
    <View style={[styles.container, style]}>
      {isStalled && (
        <View style={styles.stalledBanner} testID="bridge-stalled-banner">
          <WarningNotice
            tone="warning"
            title={t('bridge.settlement_stalled_title', "Can't check your bridge status")}
            action={
              <TouchableOpacity onPress={retryNow} testID="bridge-stalled-retry">
                <Text style={styles.stalledRetryText}>
                  {t('bridge.settlement_retry', 'Check now')}
                </Text>
              </TouchableOpacity>
            }
          >
            {t(
              'bridge.settlement_stalled_body',
              "Your funds are on the way, but we can't reach the status service. We'll keep trying."
            )}
          </WarningNotice>
        </View>
      )}
      {logic.step === 'input' && (
        <SwapInputScreen
          inToken={logic.inToken}
          outToken={logic.outToken}
          inAmount={logic.inAmount}
          outAmount={logic.outAmount}
          onInAmountChange={logic.setInAmount}
          onInTokenPress={() => logic.setShowInTokenModal(true)}
          onOutTokenPress={() => logic.setShowOutTokenModal(true)}
          inUsdValue={logic.inUsdValue}
          isLoadingQuote={logic.isLoadingQuote || logic.isLoadingEstimate}
          canReview={logic.canReview}
          reviewWarning={logic.reviewWarning}
          swapError={logic.swapError}
          onReview={logic.handleReview}
        />
      )}

      {logic.step === 'recipient' && logic.swapMode === 'stealthex' && (
        <BridgeRecipientScreen
          recipientAddress={logic.recipientAddress}
          onAddressChange={logic.setRecipientAddress}
          targetChain={logic.bridgeTargetChain}
          onBack={logic.handleBackFromRecipient}
          onContinue={logic.handleContinueToReview}
          isValidAddress={logic.addressValidation.valid}
          addressError={logic.addressError}
        />
      )}

      {logic.step === 'review' &&
        logic.swapMode === 'jupiter' &&
        logic.quote &&
        logic.inToken &&
        logic.outToken && (
          <SwapReviewScreen
            quote={logic.quote}
            inToken={logic.inToken}
            outToken={logic.outToken}
            inAmount={logic.inAmount}
            outAmount={logic.outAmount}
            onBack={logic.handleBackFromReview}
            onConfirm={logic.handleConfirmOrRefresh}
            isConfirming={logic.isConfirming}
            confirmLabel={logic.swapConfirmLabel}
          />
        )}

      {logic.step === 'review' &&
        logic.swapMode === 'stealthex' &&
        logic.bridgeInToken &&
        logic.bridgeOutToken && (
          <BridgeReviewScreen
            inToken={logic.bridgeInToken}
            outToken={logic.bridgeOutToken}
            inAmount={logic.inAmount}
            outAmount={logic.outAmount}
            recipientAddress={logic.recipientAddress}
            estimate={logic.bridgeEstimateForReview}
            onBack={logic.handleBackFromReview}
            onConfirm={logic.handleConfirmOrRefresh}
            isConfirming={logic.isConfirming}
            confirmLabel={logic.swapConfirmLabel}
          />
        )}

      {logic.step === 'success' && (
        <TransactionSuccessScreen
          title={
            logic.successExchange
              ? t('bridge.initiated', 'Bridge Initiated')
              : t('transaction.swapComplete')
          }
          pendingTitle={t('transaction.pendingSwap')}
          summary={`${successInLabel} → ${successOutLabel}`}
          explorerUrl={
            logic.successTxId && successChain
              ? getTransactionUrl(
                  successChain.toUpperCase() as Blockchain,
                  (successNetworkId ?? 'mainnet') as NetworkEnvironment,
                  getDefaultExplorer(successChain.toUpperCase() as Blockchain),
                  logic.successTxId
                )
              : null
          }
          onContinue={logic.handleSuccessContinue}
          settling={logic.settling}
          bridgeDepositAddress={logic.successExchange?.depositAddress}
          bridgeAmountIn={logic.successExchange ? successInLabel : undefined}
          bridgeAmountOut={
            logic.successExchange
              ? `${logic.successExchange.amountOut} ${successOutSymbol}`
              : undefined
          }
          bridgeExchangeId={logic.successExchange?.id}
          bridgeDepositTxId={logic.depositTxId ?? undefined}
        />
      )}

      <TokenSelectorModal
        visible={logic.showInTokenModal}
        onClose={() => logic.setShowInTokenModal(false)}
        tokens={logic.modalInTokens}
        featuredTokens={logic.modalFeaturedTokens}
        onSelect={logic.handleInTokenModalSelect}
        onSearch={logic.handleSearchTokens}
        showNetworkChip={true}
        loading={logic.tokensLoading}
      />

      <TokenSelectorModal
        visible={logic.showOutTokenModal}
        onClose={() => logic.setShowOutTokenModal(false)}
        tokens={logic.modalOutTokens}
        onSelect={logic.handleOutTokenModalSelect}
        showNetworkChip={true}
        hiddenBalance={logic.swapMode === 'stealthex'}
        loading={logic.tokensLoading || logic.isLoadingBridgeTokens}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  stalledBanner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  stalledRetryText: {
    color: colors.status.warning,
    fontFamily: fontFamilyNative.semiBold,
    fontSize: fontSize.sm,
    textDecorationLine: 'underline',
  },
});

export default SwapScreen;
