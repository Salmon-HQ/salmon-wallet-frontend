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
  semantic,
  useSwapScreenLogic,
  useWaitExit,
  getTransactionUrl,
  getDefaultExplorer,
  useBridgeSettlement,
  formatEffectiveRate,
  formatPercent,
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
import { LoadingScreen } from '../LoadingScreen';
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

  // Committed: signed and in flight, or settling. No exit at all.
  const isCommitted = logic.isConfirming || logic.settling;

  // Two phases, two rules. Up to and including review nothing has been
  // signed, so leaving is free. From confirm onward this screen is the only
  // report of whether the funds moved — a bridge in particular cannot be
  // cancelled or recovered — so ambient navigation must not discard it.
  const ownsScreen = isCommitted || logic.step === 'success';

  // The wait between the decision and the receipt (DESIGN.md, §The wait —
  // "Swap confirm — sink, wave, float"). At the confirm tap the review leaves
  // immediately — no button loader — and the canonical wave wait holds the
  // screen while sign/submit/confirm runs and, for a Jupiter swap, while the
  // indexer settles. It then leaves on its own last wave (`useWaitExit`), and
  // only once the water is calm does the receipt mount, so The Surfacing plays
  // exactly once — never over an unconfirmed transaction, and never twice.
  const { held: isWaveHeld, onExited: onWaveGone } = useWaitExit(isCommitted);
  // Keep the wave through its own exit on the way to the receipt. A failure is
  // the exception: the flow cuts back to input (the error surfaces there), so
  // the wave is not held.
  const showWave = isCommitted || (isWaveHeld && logic.step === 'success');

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

  // The exchange graphic on the receipt — the same protagonist the review
  // showed, built only from data the flow already captured at confirm time.
  const successInSymbol = summary ? summary.inSymbol : (logic.inToken?.symbol ?? '');
  const successInAmount = summary ? summary.inAmount : logic.inAmount;
  const successOutAmount = logic.successExchange
    ? String(logic.successExchange.amountOut)
    : summary
      ? summary.outAmount
      : logic.outAmount;
  const successExchangeBlock = {
    send: {
      // A bridge's payout is still travelling, so its labels keep the review's
      // present tense; a settled swap earns the past tense.
      label: logic.successExchange
        ? t('swap.you_send', 'You Send')
        : t('transactions.detail.sentLabel', 'Sent'),
      logo: summary?.inLogo ?? logic.inToken?.logo ?? undefined,
      symbol: successInSymbol,
      amount: successInLabel,
    },
    receive: {
      label: logic.successExchange
        ? t('swap.you_receive', 'You Receive')
        : t('transactions.detail.receivedLabel', 'Received'),
      logo: summary?.outLogo ?? logic.outToken?.logo ?? undefined,
      symbol: successOutSymbol,
      amount: logic.successExchange
        ? `${logic.successExchange.amountOut} ${successOutSymbol}`
        : successOutLabel,
    },
  };
  const successRate =
    formatEffectiveRate(successInAmount, successInSymbol, successOutAmount, successOutSymbol) ??
    undefined;
  const successFee = summary?.feePercent != null ? formatPercent(summary.feePercent) : undefined;

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
                  color: semantic.status.warning,
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
        !logic.isConfirming &&
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
        !logic.isConfirming &&
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

      {/* The wave wait. Its overlay covers the viewport, so it stands over
          whatever step is still mounted underneath. It holds while the
          transaction is in flight and leaves on its own last wave; the receipt
          below waits for that report. */}
      {showWave && (
        <LoadingScreen
          visible={isCommitted}
          waves
          title={t('transaction.pendingSwap')}
          subtitle={`${successInLabel} → ${successOutLabel}`}
          onExited={onWaveGone}
        />
      )}

      {logic.step === 'success' && !isWaveHeld && (
        <TransactionSuccessScreen
          title={
            logic.successExchange
              ? t('bridge.initiated', 'Bridge Initiated')
              : t('transaction.swapComplete')
          }
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
          exchange={successExchangeBlock}
          exchangeRate={successRate}
          exchangeFee={successFee}
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
