import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, BackHandler, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReAnimated, { useReducedMotion } from 'react-native-reanimated';
import {
  SOL_CONSTANTS,
  useSendTransaction,
  getTransactionUrl,
  getDefaultExplorer,
  getShortAddress,
  useWaitExit,
  semantic,
} from '@salmon/shared';
import type { Blockchain, NetworkEnvironment } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { FLOAT_DELAY_MS, floatEntering, sinkExiting } from '../../utils/sinkAndFloat';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { BottomSheetTitleHeader } from '../BottomSheetTitleHeader';
import { DepthBackground } from '../DepthBackground';
import { ScalesBackground } from '../ScalesBackground';
import { LoadingScreen } from '../LoadingScreen';
import { useTaskChromeClaim } from '../../contexts/TaskChromeContext';
import { StepTokenSelect } from './StepTokenSelect';
import { StepAddressAmount } from './StepAddressAmount';
import { StepConfirmation } from './StepConfirmation';
import { SendFailure } from './SendFailure';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import type { SendSheetProps, SendStep, SendToken } from './types';

// ============================================================================
// Constants
// ============================================================================

// ============================================================================
// Component
// ============================================================================

export const SendSheet: React.FC<SendSheetProps> = ({
  visible,
  onClose,
  tokens,
  blockchain,
  account,
  onSuccess,
  showUnverifiedTokens,
  loading,
  style,
}) => {
  // Bitcoin has only one token (BTC), so skip token selection
  const skipTokenSelect = blockchain === 'bitcoin';

  // Step management
  const [step, setStep] = useState<SendStep>(skipTokenSelect ? 'address-amount' : 'token-select');
  const [selectedToken, setSelectedToken] = useState<SendToken | null>(
    skipTokenSelect && tokens.length > 0 ? tokens[0] : null
  );
  const [recipientAddress, setRecipientAddress] = useState('');
  const [resolvedRecipientAddress, setResolvedRecipientAddress] = useState<string | undefined>(
    undefined
  );
  const [amount, setAmount] = useState('');
  const [successTxId, setSuccessTxId] = useState<string | null>(null);
  // Whether a step change has happened in this opening. The step on screen
  // floats in only once something has moved: on the sheet's own arrival the
  // first step is simply already there.
  const [stepped, setStepped] = useState(false);
  const previousVisibleRef = useRef(visible);

  const { t } = useTranslation();
  const isReduceMotionEnabled = useReducedMotion();
  const insets = useSafeAreaInsets();

  // Live balance for the selected token, derived from the reactive `tokens` prop
  // every render. RQ-backed parents update this list when funds arrive — passing
  // it down keeps MAX / quick-fill / amount validation in sync with the latest
  // on-chain state instead of the snapshot taken when the step opened.
  const liveSelectedBalance = useMemo(() => {
    if (!selectedToken) return undefined;
    const live = tokens.find((tok) => tok.address === selectedToken.address);
    if (!live) return undefined;
    return typeof live.uiAmount === 'string' ? parseFloat(live.uiAmount) : live.uiAmount;
  }, [selectedToken, tokens]);

  // The native token's own balance, which pays the fee for every transfer on
  // this chain regardless of what is being sent.
  const nativeBalance = useMemo(() => {
    const native = tokens.find((tok) => tok.address === SOL_CONSTANTS.ADDRESS);
    if (!native) return undefined;
    return typeof native.uiAmount === 'string' ? parseFloat(native.uiAmount) : native.uiAmount;
  }, [tokens]);

  // The send hook lives here, not in the confirmation step: the step unmounts
  // the moment the transfer is committed (the wait takes the screen), and a
  // hook owned there would take the in-flight transaction's only observer with
  // it. The sheet owns every dismissal path too, so it is the level that has
  // to know a transfer is in flight.
  const sendHook = useSendTransaction({ account, blockchain });
  const isSending = sendHook.status === 'creating' || sendHook.status === 'sending';
  // A failure the user can still act on. It is only ever reached from
  // `sendTransaction` — a fee estimate that fails sets `feeEstimateFailed`, not
  // this — so `failed` always means the passage is already under way.
  const sendFailed = sendHook.status === 'failed';

  const resetFlowState = useCallback(() => {
    if (skipTokenSelect && tokens.length > 0) {
      setStep('address-amount');
      setSelectedToken(tokens[0]);
    } else {
      setStep('token-select');
      setSelectedToken(null);
    }
    setRecipientAddress('');
    setResolvedRecipientAddress(undefined);
    setAmount('');
    setSuccessTxId(null);
    setStepped(false);
    sendHook.reset();
  }, [sendHook, skipTokenSelect, tokens]);

  // The sheet stays mounted across chain switches, so flow state derived from
  // one chain (step, selected token) must be re-derived the moment the
  // `blockchain` prop changes — otherwise the sheet opens showing the previous
  // chain's token. Render-time reset (not an effect) so the very first render
  // after a switch is already correct.
  const [flowBlockchain, setFlowBlockchain] = useState(blockchain);
  if (flowBlockchain !== blockchain) {
    setFlowBlockchain(blockchain);
    setStep(skipTokenSelect ? 'address-amount' : 'token-select');
    setSelectedToken(skipTokenSelect && tokens.length > 0 ? tokens[0] : null);
    setRecipientAddress('');
    setResolvedRecipientAddress(undefined);
    setAmount('');
    setSuccessTxId(null);
    setStepped(false);
  }

  // sendHook.reset() is a side effect, so it cannot run during render.
  useEffect(() => {
    sendHook.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockchain]);

  /**
   * A send in flight, and the receipt that follows it, own the screen.
   *
   * Up to that point the sheet is a card the user is filling in over their
   * wallet, and the wallet behind it is worth seeing. Once the transaction is
   * signed there is nothing to go back to and nothing else to look at, so the
   * flow stops being a card: the sheet leaves the way a sheet always leaves
   * (its own ebb), and the wait and the receipt take the whole screen in their
   * own windows.
   *
   * The two movements are deliberately simultaneous. The sheet's backdrop is
   * opaque, so closing it first would reveal an assembled home for a beat and
   * then sink it — a flash, not a passage. Publishing the task-chrome claim in
   * the same commit that hides the sheet means the home disassembles behind
   * the sheet's ebb (DESIGN.md §The sink and the float).
   *
   * **A failure keeps the screen.** Letting `failed` fall out of this
   * predicate rewound the whole passage — the sheet rose, the home
   * reassembled, and the next attempt wound all of it up again; on a flaky
   * network that read as the UI breaking. The work is no longer in flight, so
   * the wait stops (see `showWait`), but the surface it stood on does not go
   * anywhere: the failure is reported on it, retry is fired from it, and the
   * only thing that unwinds the passage is the user leaving the flow.
   */
  const taskOwnsScreen = isSending || sendFailed || step === 'success';
  const taskOwnsScreenRef = useRef(taskOwnsScreen);
  taskOwnsScreenRef.current = taskOwnsScreen;

  const engageTaskChrome = useTaskChromeClaim();
  useEffect(() => {
    engageTaskChrome(visible && taskOwnsScreen);
  }, [visible, taskOwnsScreen, engageTaskChrome]);

  // The wait between the decision and the receipt. `useWaitExit` keeps the
  // wait mounted through its own departure, so the receipt mounts only once
  // the closing wave has actually left the screen (DESIGN.md §The wait: "que
  // no se pase a la siguiente screen hasta que la última onda salga de la
  // pantalla … Esto aplica siempre").
  const { held: isWaveHeld, onExited: onWaveGone } = useWaitExit(isSending);
  const showWait = isSending || (isWaveHeld && step === 'success');
  const showReceipt = step === 'success' && !isWaveHeld && !!successTxId && !!selectedToken;

  // Handle close; state reset is driven by the visible -> false transition so
  // external closes (for example, on lock) clear the flow too.
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Latest-value ref so the close timer below can depend on `visible` alone.
  // Depending on `resetFlowState` directly would re-run the effect whenever its
  // identity changes, and the cleanup would cancel the pending reset timer
  // without re-arming it (previousVisibleRef is already overwritten).
  const resetFlowStateRef = useRef(resetFlowState);
  resetFlowStateRef.current = resetFlowState;

  useEffect(() => {
    const wasVisible = previousVisibleRef.current;
    previousVisibleRef.current = visible;
    if (visible && !wasVisible) {
      // A reopening is the sheet arriving again. Whatever the flow state is
      // (a fast reopen cancels the reset timer below and keeps it), the step
      // on screen must not float in behind the sheet's own rise.
      setStepped(false);
    }
    if (!visible && wasVisible && taskOwnsScreenRef.current) {
      // The sheet is already unmounted while the task owns the screen, so its
      // `onClosed` can never report *this* departure. "View wallet" and an
      // external close (lock) both land here, and this is where the flow —
      // and with it the chrome claim — is handed back.
      resetFlowStateRef.current();
    }
    return undefined;
  }, [visible]);

  /**
   * Reset when the sheet has actually gone, not on a guess.
   *
   * This used to run on a blind 300ms timer that did not match the sheet's
   * real exit, so the flow could be torn out from under a receipt still on
   * screen — or reset early enough to be visible.
   */
  const handleSheetClosed = useCallback(() => {
    // The sheet also closes when the task takes the screen — that departure is
    // the passage starting, not the flow ending. Resetting there would tear
    // the wait or the receipt out from under the user. The visible -> false
    // transition above is what ends the flow in that case.
    if (taskOwnsScreenRef.current) return;
    resetFlowStateRef.current();
  }, []);

  // Step navigation handlers. Every one of them goes through `goToStep`: the
  // step is what changes, and the fact that it changed is what the verb needs
  // to know.
  const goToStep = useCallback((next: SendStep) => {
    setStepped(true);
    setStep(next);
  }, []);

  const handleSuccessContinue = useCallback(() => {
    if (successTxId) {
      onSuccess?.(successTxId);
    }
    handleClose();
  }, [successTxId, onSuccess, handleClose]);

  // The flow's step order, and from it the only honest answer to "is there a
  // step behind this one?". Keying the back control on the sequence rather
  // than on a chain name means any chain that skips token selection gets a
  // correct header for free — the same reasoning that took the chevrons off
  // the settings rows in DESIGN.md §Motion: an affordance that promises a
  // step that does not exist is worse than no affordance.
  const stepSequence = useMemo<SendStep[]>(
    () =>
      skipTokenSelect
        ? ['address-amount', 'confirmation']
        : ['token-select', 'address-amount', 'confirmation'],
    [skipTokenSelect]
  );
  const previousStep: SendStep | undefined = stepSequence[stepSequence.indexOf(step) - 1];

  // Handle Android back button (step-aware)
  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Signing is under way: there is no safe step to go back to, and the
      // screen reporting the outcome is this one.
      if (isSending) {
        return true;
      }
      // The failure surface has exactly one way out, and it is the same one
      // its own control offers: leave the flow. Falling through to the step
      // handlers would change the step underneath a surface that is still on
      // screen, because `sendFailed` — not the step — is what holds it there.
      if (sendFailed) {
        handleClose();
        return true;
      }
      if (step === 'success') {
        handleSuccessContinue();
      } else if (previousStep) {
        goToStep(previousStep);
      } else {
        // Nothing behind the first step: the hardware back leaves the sheet,
        // which is a destination the system gesture always has.
        handleClose();
      }
      return true;
    });

    return () => backHandler.remove();
  }, [
    visible,
    step,
    previousStep,
    handleClose,
    handleSuccessContinue,
    isSending,
    sendFailed,
    goToStep,
  ]);

  const handleSelectToken = useCallback(
    (token: SendToken) => {
      setSelectedToken(token);
      goToStep('address-amount');
    },
    [goToStep]
  );

  const handleBackToTokenSelect = useCallback(() => {
    goToStep('token-select');
  }, [goToStep]);

  const handleReview = useCallback(
    (address: string, amt: string, resolvedAddress?: string) => {
      setRecipientAddress(address);
      setResolvedRecipientAddress(resolvedAddress);
      setAmount(amt);
      goToStep('confirmation');
    },
    [goToStep]
  );

  const handleBackToAddressAmount = useCallback(() => {
    goToStep('address-amount');
    sendHook.reset();
  }, [goToStep, sendHook]);

  const handleSuccess = useCallback(
    (txId: string) => {
      setSuccessTxId(txId);
      goToStep('success');
    },
    [goToStep]
  );

  /**
   * Commit the transfer. It lives here rather than in the confirmation step
   * for the same reason the hook does: the step unmounts the instant the
   * screen is handed over, and retry has to be able to fire the *same*
   * transaction from the task surface the step is no longer on.
   *
   * Firing it straight into the hook is also what keeps retry from flashing:
   * `sendFailed` holds the task surface right up to the commit in which
   * `creating` replaces it, so the predicate above never dips false and
   * neither the sheet nor the home gets a frame to reassemble in.
   */
  const submitSend = useCallback(async () => {
    if (!selectedToken) return;
    try {
      const result = await sendHook.sendTransaction({
        token: {
          address: selectedToken.address,
          decimals: selectedToken.decimals ?? 9,
          symbol: selectedToken.symbol,
        },
        recipientAddress,
        resolvedRecipientAddress,
        amount: parseFloat(amount),
      });
      handleSuccess(result.txId);
    } catch {
      // The hook's `failed` status is the report; the task surface renders it.
    }
  }, [sendHook, selectedToken, recipientAddress, resolvedRecipientAddress, amount, handleSuccess]);

  // Back button handler for the header
  const handleBackPress = useCallback(() => {
    if (isSending || !previousStep) return;
    if (step === 'confirmation') {
      handleBackToAddressAmount();
    } else {
      goToStep(previousStep);
    }
  }, [step, previousStep, handleBackToAddressAmount, isSending, goToStep]);

  // Drawn only when the step it would return to exists.
  const showBackButton = previousStep !== undefined && !isSending;
  const showHeader = step !== 'success' && !isSending;

  const summary = selectedToken
    ? `${amount} ${selectedToken.symbol} to ${getShortAddress(recipientAddress) ?? recipientAddress}`
    : '';

  const headerContent = (
    <BottomSheetTitleHeader
      title={t('token.action.send')}
      onBack={showBackButton ? handleBackPress : undefined}
      backAccessibilityLabel={t('general.back', 'Back')}
    />
  );

  // A step change inside this sheet speaks the verb: the step that leaves
  // sinks, the beat passes, and the step that arrives floats up in its place.
  // Back is the mirror, and reduce motion resolves both halves to an instant
  // cut with the step still changing.
  //
  // DESIGN.md §Motion's rule that a sheet's content never speaks the verb is
  // about the sheet arriving and leaving — it rises from the bottom and ebbs
  // the same way, and its content does not travel with it. That is why the
  // first step of the flow has no entrance of its own: on the sheet's own
  // arrival it is simply already there, and content that spoke the verb then
  // would say it twice. `stepped` is what tells the two events apart.
  //
  // The receipt is no longer a step in here at all: it has its own window
  // below, and it arrives whole (DESIGN.md §The receipt: "A send or NFT
  // receipt arrives whole"), with no entrance of its own.
  const stepExiting = sinkExiting(isReduceMotionEnabled);
  const stepEntering = stepped
    ? floatEntering(isReduceMotionEnabled, { delayMs: FLOAT_DELAY_MS })
    : undefined;

  return (
    <>
      <BottomSheetContainer
        visible={visible && !taskOwnsScreen}
        onClose={handleClose}
        onClosed={handleSheetClosed}
        dismissible={!isSending}
        headerContent={showHeader ? headerContent : undefined}
        style={style}
      >
        {/* Content */}
        <View style={styles.content}>
          {step === 'token-select' && (
            <ReAnimated.View
              key="send-step-token-select"
              testID="send-step-token-select"
              style={styles.step}
              entering={stepEntering}
              exiting={stepExiting}
            >
              <StepTokenSelect
                tokens={tokens}
                onSelectToken={handleSelectToken}
                showUnverifiedTokens={showUnverifiedTokens}
                loading={loading}
              />
            </ReAnimated.View>
          )}

          {step === 'address-amount' && selectedToken && (
            <ReAnimated.View
              key="send-step-address-amount"
              testID="send-step-address-amount"
              style={styles.step}
              entering={stepEntering}
              exiting={stepExiting}
            >
              <StepAddressAmount
                token={selectedToken}
                liveBalance={liveSelectedBalance}
                nativeBalance={nativeBalance}
                blockchain={blockchain}
                account={account}
                onBack={stepSequence.includes('token-select') ? handleBackToTokenSelect : undefined}
                onReview={handleReview}
                onCancel={handleClose}
              />
            </ReAnimated.View>
          )}

          {step === 'confirmation' && selectedToken && (
            <ReAnimated.View
              key="send-step-confirmation"
              testID="send-step-confirmation"
              style={styles.step}
              entering={stepEntering}
              exiting={stepExiting}
            >
              <StepConfirmation
                token={selectedToken}
                recipientAddress={recipientAddress}
                resolvedRecipientAddress={resolvedRecipientAddress}
                amount={amount}
                blockchain={blockchain}
                account={account}
                onBack={handleBackToAddressAmount}
                onCancel={handleClose}
                onSuccess={handleSuccess}
                onConfirm={submitSend}
                sendHook={sendHook}
              />
            </ReAnimated.View>
          )}
        </View>
      </BottomSheetContainer>

      {/* The wave wait, in its own window above every piece of chrome. Its
          entry beat is intrinsic to LoadingScreen, so the sheet's ebb and the
          home's sink play under it. It leaves on its own last wave, and the
          receipt below waits for that report. */}
      {showWait && (
        <LoadingScreen
          fullScreen
          visible={isSending}
          waves
          title={t('transaction.pendingSend')}
          subtitle={summary}
          bottomOffset={insets.bottom}
          onExited={onWaveGone}
        />
      )}

      {/* The failure, on the very surface the wait was standing on. Its own
          window for the same reason the receipt has one: the sheet is gone and
          the home is disassembled, and this is what the passage shows instead.
          The wave cut rather than ebbing (DESIGN.md §The wait: on a failure
          "nothing surfaces"), so the report floats up into the space it left —
          the verb's arriving half, and the only movement here. */}
      <Modal
        visible={sendFailed}
        animationType="none"
        presentationStyle="fullScreen"
        onRequestClose={handleClose}
        testID="send-failure-modal"
      >
        <View style={[styles.taskSurface, { paddingTop: insets.top }]}>
          <DepthBackground />
          <ScalesBackground variant="deepField" />
          <ReAnimated.View
            key="send-failure-surface"
            testID="send-failure-surface"
            style={styles.failureSurface}
            entering={floatEntering(isReduceMotionEnabled)}
          >
            <SendFailure
              title={t('transaction.sendFailed')}
              // The hook hands back a translation key, never a raw chain error.
              message={t(sendHook.error ?? 'transaction.errors.generic')}
              retryLabel={t('actions.retry')}
              dismissLabel={t('transaction.continue')}
              onRetry={submitSend}
              onDismiss={handleClose}
              bottomInset={insets.bottom}
            />
          </ReAnimated.View>
        </View>
      </Modal>

      {/* The receipt. Its own window, but the same water as everything else —
          the depth ramp and the deep-field scales, exactly as the swap task
          window mounts them. `animationType="none"`: it arrives whole. */}
      <Modal
        visible={showReceipt}
        animationType="none"
        presentationStyle="fullScreen"
        onRequestClose={handleSuccessContinue}
        testID="send-receipt-modal"
      >
        <View style={[styles.taskSurface, { paddingTop: insets.top }]}>
          <DepthBackground />
          <ScalesBackground variant="deepField" />
          {selectedToken && successTxId && (
            <TransactionSuccessScreen
              title={t('transaction.sendComplete')}
              pendingTitle={t('transaction.pendingSend')}
              summary={summary}
              explorerUrl={getTransactionUrl(
                blockchain.toUpperCase() as Blockchain,
                account.getNetworkId() as NetworkEnvironment,
                getDefaultExplorer(blockchain.toUpperCase() as Blockchain),
                successTxId
              )}
              onContinue={handleSuccessContinue}
              settling={sendHook.settling}
            />
          )}
        </View>
      </Modal>
    </>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  /** The receipt's window: the same water column the task shell paints. */
  taskSurface: {
    flex: 1,
    backgroundColor: semantic.depth.column,
  },
  /** The failure's report fills the task surface it inherited from the wait. */
  failureSurface: {
    flex: 1,
  },
  // The two halves of a step change overlap: one sinks while the other floats
  // up in the same box, so the steps are stacked, not laid out in sequence.
  step: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default SendSheet;
