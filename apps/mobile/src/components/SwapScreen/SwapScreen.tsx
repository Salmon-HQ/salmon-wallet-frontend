import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useSwapScreenLogic,
  useWaitExit,
  getTransactionUrl,
  getDefaultExplorer,
  formatEffectiveRate,
  formatPercent,
  useBridgeSettlement,
  useAccountsContext,
  isWatchOnlyAccount,
  fontFamilyNative,
  fontSize,
  semantic,
  spacing,
} from '@salmon/shared';
import type { Blockchain, NetworkEnvironment, NetworkId } from '@salmon/shared';
import { useTranslation } from 'react-i18next';
import { SwapInputScreen } from './SwapInputScreen';
import { SwapReviewScreen } from './SwapReviewScreen';
import { DepthBackground } from '../DepthBackground';
import { ScalesBackground } from '../ScalesBackground';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import { LoadingScreen } from '../LoadingScreen';
import { TokenSelectorModal } from '../TokenSelector';
import { BridgeRecipientScreen } from '../BridgeScreen/BridgeRecipientScreen';
import { BridgeReviewScreen } from '../BridgeScreen/BridgeReviewScreen';
import { WarningNotice } from '../WarningNotice';
import { FLOAT_DELAY_MS, floatEntering, sinkExiting } from '../../utils/sinkAndFloat';
import { useTaskChromeClaim } from '../../contexts/TaskChromeContext';
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
  const insets = useSafeAreaInsets();

  const { trackBridgeExchange, isStalled, retryNow } = useBridgeSettlement();

  // A watch-only wallet holds no key, so nothing here can be signed. The swap
  // route's `href` gate is unconditional now (swap became a powerup), so the
  // screen is reachable by deep link and by any future entry point — the
  // refusal has to live on the screen, not on the tab that used to hide it.
  const [{ activeAccount }] = useAccountsContext();
  const isWatchOnly = isWatchOnlyAccount(activeAccount);

  const isReduceMotionEnabled = useReducedMotion();

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

  // Review, in-flight and outcome are a *task*, not a tab destination. They
  // used to render as tab content with the account header above and the tab
  // bar below, so a user could wander to Collectibles after signing — and the
  // screen reporting the outcome is the only one that will ever report it.
  // An RN Modal is its own window: it covers the gate header and the tab bar,
  // the same way Send and Receive already do on this platform.
  const isTaskStep = logic.step === 'review' || logic.step === 'success';
  // Committed: signed and in flight, or settling. No exit at all.
  const isCommitted = logic.isConfirming || logic.settling;

  // The wait between the decision and the receipt. At the confirm tap the
  // review sinks immediately — no button loader — and the canonical wave wait
  // (LoadingScreen, the app's waiting language) holds while sign/submit/
  // confirm runs and, for a Jupiter swap, while the indexer settles. The wait
  // then exits on its last wave (useWaitExit), and only once the water is
  // calm does the receipt mount, so the receipt arrives exactly once — never
  // over an unconfirmed transaction, and never twice.
  const { held: isWaveHeld, onExited: onWaveGone } = useWaitExit(isCommitted);
  // Render the wave while the outcome is pending, and keep it through its own
  // exit on the way to the receipt. A failure is the exception: the flow cuts
  // back to input (the error surfaces there), so the wave is not held.
  const showWave = isCommitted || (isWaveHeld && logic.step === 'success');

  // Step changes speak the sink and the float: the outgoing step sinks as its
  // light goes, the incoming one floats up into place. The ground under them —
  // DepthBackground, ScalesBackground — is mounted outside the steps and never
  // travels. The success step is the one exception: the receipt arrives whole
  // (DESIGN.md §The receipt), so the verb has nothing to double — the wave
  // wait's exit is the only thing that precedes it, and it mounts with no
  // entering of its own.
  // Under reduce motion the helpers return undefined and every step change is
  // an instant cut.
  //
  // The beat (owner, on-device): the float waits out the sink plus a short
  // pause — but only when something actually sank. The previous step is
  // tracked with the render-time setState pattern (not a ref: refs cannot be
  // read during render), so the delay applies on the renders where a step
  // swap happens, never on the screen's first mount. A success exit is a cut
  // by design (nothing sinks), so it earns no beat either.
  const [stepSwap, setStepSwap] = useState({
    step: logic.step,
    hasPrior: false,
    fromSuccess: false,
  });
  if (stepSwap.step !== logic.step) {
    setStepSwap({
      step: logic.step,
      hasPrior: true,
      fromSuccess: stepSwap.step === 'success',
    });
  }
  const stepDelayMs = stepSwap.hasPrior && !stepSwap.fromSuccess ? FLOAT_DELAY_MS : 0;
  const stepEntering = floatEntering(isReduceMotionEnabled, { delayMs: stepDelayMs });
  const stepExiting = sinkExiting(isReduceMotionEnabled);
  // Inside the task window the wait already happened while the window stayed
  // hidden (below) — a second delay there would read as lag. The Jupiter
  // review does not use this: its entrance lives inside SwapReviewScreen,
  // banded (title → exchange → details → warning → buttons on the
  // Surfacing's stagger), so the wrapper there only carries the exit.
  const taskStepEntering = floatEntering(isReduceMotionEnabled);

  // The task window and the verb: review lives in an RN Modal — its own
  // native window — and entering/exiting cannot speak across a window
  // boundary. The Modal's slide used to swallow the verb: input's sink played
  // invisibly under the rising cover, and review mounted *with* the new
  // window instead of floating into it. So the window itself is choreographed
  // instead: `animationType="none"`, and visibility waits out whichever half
  // of the verb is playing on the other side. Opening — input sinks in the
  // shell, a beat, the window appears and review floats up inside it.
  // Closing from review — review sinks inside the window, a beat, the window
  // vanishes exactly as the shell's (delayed) input float begins. Closing
  // from success is a cut, per the exception above. Reduce motion flips
  // visibility immediately.
  const [isTaskWindowVisible, setIsTaskWindowVisible] = useState(isTaskStep);
  useEffect(() => {
    if (isTaskStep === isTaskWindowVisible) return undefined;
    if (isReduceMotionEnabled || (!isTaskStep && stepSwap.fromSuccess)) {
      setIsTaskWindowVisible(isTaskStep);
      return undefined;
    }
    const timer = setTimeout(() => setIsTaskWindowVisible(isTaskStep), FLOAT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isTaskStep, isTaskWindowVisible, isReduceMotionEnabled, stepSwap.fromSuccess]);

  // The compuerta and the pill (owner, on-device): the shell's chrome is part
  // of the transition. Engaged the moment the task begins — the gate rises
  // and the tab bar sinks during the beat, before the window covers them —
  // and held until the window has actually gone, so on the way back the
  // chrome returns exactly as the shell's delayed input float begins.
  const engageTaskChrome = useTaskChromeClaim();
  useEffect(() => {
    engageTaskChrome(isTaskStep || isTaskWindowVisible);
  }, [isTaskStep, isTaskWindowVisible, engageTaskChrome]);
  // Leaving the swap tab entirely must hand the chrome back.
  // Release on unmount is the claim hook's own job now.

  const handleTaskDismiss = useCallback(() => {
    if (isCommitted) return;
    if (logic.step === 'review') {
      // Back out of review is safe — nothing has been signed.
      logic.handleBackFromReview();
      return;
    }
    logic.handleSuccessContinue();
  }, [isCommitted, logic]);

  // The review screens reserve room for the tab bar they used to sit under.
  // Inside the task window there is no tab bar, only the home indicator.
  const taskScreenStyle = { paddingBottom: insets.bottom + spacing.lg };

  const stalledBanner = isStalled ? (
    <View style={styles.stalledBanner} testID="bridge-stalled-banner">
      <WarningNotice
        tone="warning"
        title={t('bridge.settlement_stalled_title', "Can't check your bridge status")}
        action={
          <TouchableOpacity onPress={retryNow} testID="bridge-stalled-retry">
            <Text style={styles.stalledRetryText}>{t('bridge.settlement_retry', 'Check now')}</Text>
          </TouchableOpacity>
        }
      >
        {t(
          'bridge.settlement_stalled_body',
          "Your funds are on the way, but we can't reach the status service. We'll keep trying."
        )}
      </WarningNotice>
    </View>
  ) : null;

  // Same refusal the home screen shows beside its disabled Send: one
  // explanation, not a tooltip per control.
  if (isWatchOnly) {
    return (
      <View
        testID="swap-watch-only-notice"
        style={[styles.container, styles.watchOnlyContainer, style]}
      >
        <WarningNotice
          tone="warning"
          title={t('wallet.watchOnly.badge')}
          style={styles.watchOnlyNotice}
        >
          {t('wallet.watchOnly.disabled_action')}
        </WarningNotice>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {!isTaskStep && stalledBanner}
      {logic.step === 'input' && (
        <Animated.View style={styles.step} entering={stepEntering} exiting={stepExiting}>
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
            bridgeReference={
              logic.lastBridgeExchange
                ? {
                    id: logic.lastBridgeExchange.id,
                    depositAddress: logic.lastBridgeExchange.depositAddress,
                  }
                : null
            }
            onReview={logic.handleReview}
          />
        </Animated.View>
      )}

      {logic.step === 'recipient' && logic.swapMode === 'stealthex' && (
        <Animated.View style={styles.step} entering={stepEntering} exiting={stepExiting}>
          <BridgeRecipientScreen
            recipientAddress={logic.recipientAddress}
            onAddressChange={logic.setRecipientAddress}
            targetChain={logic.bridgeTargetChain}
            onBack={logic.handleBackFromRecipient}
            onContinue={logic.handleContinueToReview}
            isValidAddress={logic.addressValidation.valid}
            addressError={logic.addressError}
          />
        </Animated.View>
      )}

      <Modal
        visible={isTaskWindowVisible}
        animationType="none"
        presentationStyle="fullScreen"
        onRequestClose={handleTaskDismiss}
        testID="swap-task-modal"
      >
        <View style={[styles.taskSurface, { paddingTop: insets.top }]}>
          {/* Its own window, but the same water. The task modal covers the tab
              shell — and with it the water column the shell paints — so it
              mounts the same ground the DOM task steps sit over: the depth
              ramp and the deep-field scales. The receipt is
              not a wall; it arrives over the same water as everything else. */}
          <DepthBackground />
          <ScalesBackground variant="deepField" />
          {stalledBanner}

          {logic.step === 'review' &&
            !logic.isConfirming &&
            logic.swapMode === 'jupiter' &&
            logic.quote &&
            logic.inToken &&
            logic.outToken && (
              <Animated.View style={styles.step} exiting={stepExiting}>
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
                  style={taskScreenStyle}
                />
              </Animated.View>
            )}

          {logic.step === 'review' &&
            !logic.isConfirming &&
            logic.swapMode === 'stealthex' &&
            logic.bridgeInToken &&
            logic.bridgeOutToken && (
              <Animated.View style={styles.step} entering={taskStepEntering} exiting={stepExiting}>
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
                  style={taskScreenStyle}
                />
              </Animated.View>
            )}

          {/* The wave wait — its own step. The beat after the review's sink
              is intrinsic to LoadingScreen now (its content waits out
              FLOAT_DELAY_MS on its own), so the wrapper carries only the
              undelayed float — a second delay here would double-count the
              beat. It holds while the transaction is in flight and leaves on
              its own last wave; the receipt below waits for that report. */}
          {showWave && (
            <Animated.View style={styles.step} entering={taskStepEntering}>
              <LoadingScreen
                visible={isCommitted}
                waves
                title={t('transaction.pendingSwap')}
                subtitle={`${successInLabel} → ${successOutLabel}`}
                bottomOffset={insets.bottom}
                onExited={onWaveGone}
              />
            </Animated.View>
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
            />
          )}
        </View>
      </Modal>

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
        // You Receive: what you already hold is noise when choosing what to get.
        showBalances={false}
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
  // One step on screen at a time; the wrapper exists so the step can travel
  // (sink out, float in) while the mounted world behind it holds still.
  step: {
    flex: 1,
  },
  // The task window is its own surface: opaque, because it no longer sits on
  // the tab shell's ground, and `fullScreen` so iOS cannot swipe it away.
  taskSurface: {
    flex: 1,
    backgroundColor: semantic.depth.column,
  },
  watchOnlyContainer: {
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  watchOnlyNotice: {
    marginBottom: spacing.lg,
  },
  stalledBanner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  stalledRetryText: {
    color: semantic.status.warning,
    fontFamily: fontFamilyNative.semiBold,
    fontSize: fontSize.sm,
    textDecorationLine: 'underline',
  },
});

export default SwapScreen;
