/**
 * SwapScreen - Swap interface (Web/Extension)
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Replaces RN Alert with window.alert, uses web TokenSelectorModal.
 */
import React from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import {
  useSwapScreenLogic,
  useWaitExit,
  getTransactionUrl,
  getDefaultExplorer,
  formatEffectiveRate,
  formatPercent,
} from '@salmon/shared';
import type { Blockchain, NetworkEnvironment } from '@salmon/shared';
import { useTranslation } from 'react-i18next';
import { SwapInputScreen } from './SwapInputScreen';
import { SwapReviewScreen } from './SwapReviewScreen';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import { LoadingScreen } from '../LoadingScreen';
import { TokenSelectorModal } from '../TokenSelector';
import type { SwapScreenProps } from './types';

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

  const logic = useSwapScreenLogic(props);

  // Committed: signed and in flight, or settling. No exit at all.
  const isCommitted = logic.isConfirming || logic.settling;

  // Two phases, two rules. Up to and including review nothing has been
  // signed, so leaving is free. From confirm onward this screen is the only
  // report of whether the funds moved, so ambient navigation must not
  // discard it.
  const ownsScreen = isCommitted || logic.step === 'success';

  // The wait between the decision and the receipt (DESIGN.md, §The wait —
  // "Swap confirm — sink, wave, float"). At the confirm tap the review leaves
  // immediately — no button loader — and the canonical wave wait holds the
  // screen while sign/submit/confirm runs and while the indexer settles. It
  // then leaves on its own last wave (`useWaitExit`), and only once the water
  // is calm does the receipt mount, so the receipt arrives exactly once —
  // never over an unconfirmed transaction, and never twice.
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
  const successChain = summary ? summary.chain : logic.inToken?.chain;
  const successNetworkId = summary ? summary.networkId : logic.inToken?.networkId;

  const successInSymbol = summary ? summary.inSymbol : (logic.inToken?.symbol ?? '');
  const successInAmount = summary ? summary.inAmount : logic.inAmount;
  const successOutAmount = summary ? summary.outAmount : logic.outAmount;
  const successExchangeBlock = {
    send: {
      label: t('transactions.detail.sentLabel', 'Sent'),
      logo: summary?.inLogo ?? logic.inToken?.logo ?? undefined,
      symbol: successInSymbol,
      amount: successInLabel,
    },
    receive: {
      label: t('transactions.detail.receivedLabel', 'Received'),
      logo: summary?.outLogo ?? logic.outToken?.logo ?? undefined,
      symbol: summary ? summary.outSymbol : (logic.outToken?.symbol ?? ''),
      amount: successOutLabel,
    },
  };
  const successRate =
    formatEffectiveRate(
      successInAmount,
      successInSymbol,
      successOutAmount,
      successExchangeBlock.receive.symbol
    ) ?? undefined;
  const successFee = summary?.feePercent != null ? formatPercent(summary.feePercent) : undefined;

  return (
    <Container style={style}>
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
          isLoadingQuote={logic.isLoadingQuote}
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
          title={t('transaction.swapComplete')}
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
        showBalances={false}
        loading={logic.tokensLoading}
      />
    </Container>
  );
}
