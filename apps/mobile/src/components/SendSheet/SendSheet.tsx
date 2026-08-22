import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, BackHandler } from 'react-native';
import ReAnimated, { useReducedMotion } from 'react-native-reanimated';
import {
  useSendTransaction,
  getTransactionUrl,
  getDefaultExplorer,
  getShortAddress,
} from '@salmon/shared';
import type { Blockchain, NetworkEnvironment } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { FLOAT_DELAY_MS, floatEntering, sinkExiting } from '../../utils/sinkAndFloat';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { BottomSheetTitleHeader } from '../BottomSheetTitleHeader';
import { StepTokenSelect } from './StepTokenSelect';
import { StepAddressAmount } from './StepAddressAmount';
import { StepConfirmation } from './StepConfirmation';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import type { SendSheetProps, SendStep, SendToken } from './types';

// ============================================================================
// Constants
// ============================================================================

const ANIMATION_DURATION = 300;

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
  // Raised by StepConfirmation while the transfer is in flight. The sheet owns
  // every dismissal path, so it is the level that has to know.
  const [isSending, setIsSending] = useState(false);
  // Whether a step change has happened in this opening. The step on screen
  // floats in only once something has moved: on the sheet's own arrival the
  // first step is simply already there.
  const [stepped, setStepped] = useState(false);
  const previousVisibleRef = useRef(visible);

  const { t } = useTranslation();
  const isReduceMotionEnabled = useReducedMotion();

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

  // Send hook
  const sendHook = useSendTransaction({ account, blockchain });

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
    setIsSending(false);
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
    setIsSending(false);
    setStepped(false);
  }

  // sendHook.reset() is a side effect, so it cannot run during render.
  useEffect(() => {
    sendHook.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockchain]);

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
    if (!visible && wasVisible) {
      const timer = setTimeout(() => {
        resetFlowStateRef.current();
      }, ANIMATION_DURATION);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [visible]);

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
  }, [visible, step, previousStep, handleClose, handleSuccessContinue, isSending, goToStep]);

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
  const showHeader = step !== 'success';

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
  // The success step is the one exception on the arriving side. The receipt
  // owns its entrance — its bands float in one after another in reading order
  // (DESIGN.md §The receipt) — so floating the whole step in as a unit would
  // make it arrive twice, once as a block and once band by band. The
  // confirmation still sinks away under it; what replaces it is the receipt's
  // own sequence.
  const stepExiting = sinkExiting(isReduceMotionEnabled);
  const stepEntering = stepped
    ? floatEntering(isReduceMotionEnabled, { delayMs: FLOAT_DELAY_MS })
    : undefined;

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={handleClose}
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
              onSendingChange={setIsSending}
            />
          </ReAnimated.View>
        )}

        {step === 'success' && successTxId && selectedToken && (
          <View testID="send-step-success" style={styles.step}>
            <TransactionSuccessScreen
              title={t('transaction.sendComplete')}
              pendingTitle={t('transaction.pendingSend')}
              summary={`${amount} ${selectedToken.symbol} to ${getShortAddress(recipientAddress) ?? recipientAddress}`}
              explorerUrl={getTransactionUrl(
                blockchain.toUpperCase() as Blockchain,
                account.getNetworkId() as NetworkEnvironment,
                getDefaultExplorer(blockchain.toUpperCase() as Blockchain),
                successTxId
              )}
              onContinue={handleSuccessContinue}
              settling={sendHook.settling}
            />
          </View>
        )}
      </View>
    </BottomSheetContainer>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  // The two halves of a step change overlap: one sinks while the other floats
  // up in the same box, so the steps are stacked, not laid out in sequence.
  step: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default SendSheet;
