/**
 * SwapScreen - Unified swap/bridge interface (Web/Extension)
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Replaces RN Alert with window.alert, uses web TokenSelectorModal.
 */
import React from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import {
  useSwapScreenLogic,
  getTransactionUrl,
  getDefaultExplorer,
  useBridgeSettlement,
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
} from '@salmon/shared';
import type { Blockchain, NetworkEnvironment, NetworkId } from '@salmon/shared';
import { useTranslation } from 'react-i18next';
import { SwapInputScreen } from './SwapInputScreen';
import { SwapReviewScreen } from './SwapReviewScreen';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import { BridgeRecipientScreen } from '../BridgeScreen/BridgeRecipientScreen';
import { BridgeReviewScreen } from '../BridgeScreen/BridgeReviewScreen';
import { TokenSelectorModal } from '../TokenSelector';
import { WarningNotice } from '../WarningNotice';
import type { SwapScreenProps } from './types';

const ReferenceLabel = styled(Box)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: colors.text.tertiary,
});

const ReferenceValue = styled(Box)({
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  color: colors.text.primary,
  wordBreak: 'break-all',
  marginBottom: spacing.sm,
  userSelect: 'text',
});

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
  position: 'relative',
});

export function SwapScreen(props: SwapScreenProps): React.ReactElement {
  const { style, onFlowLockChange, onTaskChange } = props;
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

  // Two phases, two rules. Up to and including review nothing has been
  // signed, so leaving is free. From confirm onward this screen is the only
  // report of whether the funds moved — a bridge in particular cannot be
  // cancelled or recovered — so ambient navigation must not discard it.
  const ownsScreen = logic.isConfirming || logic.settling || logic.step === 'success';

  React.useEffect(() => {
    onFlowLockChange?.(ownsScreen);
    return () => onFlowLockChange?.(false);
  }, [ownsScreen, onFlowLockChange]);

  // A task, not a tab. From review onward the screen has a point of no return
  // ahead of it and its own back arrow behind it; the header and the tab bar
  // are a second way out that knows nothing about either. Same boundary mobile
  // already draws with its `Modal`.
  const isTaskStep = logic.step === 'review' || logic.step === 'success';

  React.useEffect(() => {
    onTaskChange?.(isTaskStep);
    return () => onTaskChange?.(false);
  }, [isTaskStep, onTaskChange]);

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
    <Container style={style}>
      {isStalled && (
        <Box
          sx={{ padding: `${spacing.md}px ${spacing.lg}px 0` }}
          data-testid="bridge-stalled-banner"
        >
          <WarningNotice
            tone="warning"
            title={t('bridge.settlement_stalled_title', "Can't check your bridge status")}
            action={
              <ButtonBase
                onClick={retryNow}
                data-testid="bridge-stalled-retry"
                sx={{
                  color: colors.status.warning,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  textDecoration: 'underline',
                }}
              >
                {t('bridge.settlement_retry', 'Check now')}
              </ButtonBase>
            }
          >
            {t(
              'bridge.settlement_stalled_body',
              "Your funds are on the way, but we can't reach the status service. We'll keep trying."
            )}
          </WarningNotice>
        </Box>
      )}
      {/* A bridge that failed after its exchange was created leaves the user
          with an open order and, until now, nothing to quote. The id and
          deposit address are the only handles support has, so they are shown
          beside the error on the screen the failure drops the user onto —
          as a reference to keep, not as debug output. */}
      {logic.step === 'input' && logic.swapError && logic.lastBridgeExchange && (
        <Box sx={{ padding: `${spacing.md}px ${spacing.lg}px 0` }} data-testid="bridge-reference">
          <WarningNotice tone="warning" title={t('bridge.reference_title', 'Keep this reference')}>
            <Box sx={{ marginBottom: `${spacing.sm}px` }}>
              {t(
                'bridge.reference_body',
                'This bridge did not complete, but the exchange was already created. Save these details — they are what support needs to look it up.'
              )}
            </Box>
            <ReferenceLabel>{t('bridge.exchangeId', 'Exchange ID')}</ReferenceLabel>
            <ReferenceValue data-testid="bridge-reference-exchange-id">
              {logic.lastBridgeExchange.id}
            </ReferenceValue>
            <ReferenceLabel>{t('bridge.depositAddressLabel', 'Deposit address')}</ReferenceLabel>
            <ReferenceValue data-testid="bridge-reference-deposit-address">
              {logic.lastBridgeExchange.depositAddress}
            </ReferenceValue>
          </WarningNotice>
        </Box>
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
            isRefreshing={logic.isLoadingQuote}
            confirmLabel={logic.swapConfirmLabel}
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
            isRefreshing={logic.isLoadingEstimate}
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
          bridgeStatus={logic.bridgeTransaction?.status ?? logic.successExchange?.status}
          bridgePayoutTxId={logic.bridgeTransaction?.payoutTxId}
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
    </Container>
  );
}
