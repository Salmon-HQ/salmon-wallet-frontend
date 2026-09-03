/**
 * SendPage — the send flow, four screens, one passage, on the DOM.
 *
 * The mobile twin is the route stack `apps/mobile/app/(app)/send` (`index`,
 * `amount`, `review`, `success`) under `_layout.tsx`, which holds the flow's
 * state and the passage — the wait and the failure. With a collectible it is
 * `app/(app)/nft/[id]` instead: recipient, review, receipt, no amount.
 *
 * The DOM has no route stack, so the four screens are one component that
 * calls the shared `useSendFlowState` directly — the same hook mobile's
 * `SendFlowProvider` mounts above its routes.
 * A step change speaks the verb: what leaves sinks, what arrives floats —
 * `SinkFloat` in place of the stack's slide. The first step is simply there
 * when the flow opens, and the receipt arrives whole, so neither floats.
 *
 * The passage is unchanged from mobile: one wave wait spanning signature
 * through settle, held past its own exit so the receipt only arrives once the
 * last wave has left; a failure stays on the surface the wait stood on, and
 * retry fires the same transfer from there. A broadcast whose outcome could
 * not be established is not a failure: the heading says "Send unconfirmed".
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  classifyTransactionError,
  getShortAddress,
  useNftTransfer,
  useSendFlowState,
  useWaitExit,
  type SendRecipient,
  type SendStep,
  type SendToken,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { floatEntering, useReducedMotion } from '../../motion';
import { DepthBackground } from '../DepthBackground';
import { LoadingScreen } from '../LoadingScreen';
import { ScalesBackground } from '../ScalesBackground';
import { SinkFloat } from '../SinkFloat';
import { SendFailure } from './SendFailure';
import { StepAmount } from './StepAmount';
import { StepRecipient } from './StepRecipient';
import { StepReview } from './StepReview';
import { StepSuccess } from './StepSuccess';

import type { SendPageProps } from './types';

/** The verb's frame is transparent to the layout it was inserted into. */
const stepFrame: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
};

export function SendPage({
  tokens,
  blockchain,
  networkId,
  account,
  nft = null,
  onBack,
  onSuccess,
  loading = false,
  onFlowLockChange,
}: SendPageProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const reducedMotion = useReducedMotion();

  const [step, setStep] = useState<SendStep>('recipient');
  // Whether a step change has happened since this flow opened: the step on
  // screen floats in only once something has actually moved.
  const [stepped, setStepped] = useState(false);

  const flow = useSendFlowState({ account, blockchain, tokens });
  const { token, setToken, recipient, setRecipient, amount, setAmount, sendHook, txId, submit } =
    flow;

  // ---------------------------------------------------------- collectible ---
  // Mobile's `NftFlowContext`, the send half: the same `useNftTransfer`, the
  // same NFT object, paid at the resolved address.
  const { sendNft, settling: nftSettling } = useNftTransfer({ account });
  const [nftSending, setNftSending] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);
  const [nftTxId, setNftTxId] = useState<string | null>(null);

  const submitNft = useCallback(async () => {
    if (!nft || !recipient || nftSending) return;
    setNftSending(true);
    setNftError(null);
    try {
      const result = await sendNft(nft, recipient.resolvedAddress ?? recipient.address);
      setNftTxId(result.txId);
      setStepped(true);
      setStep('success');
    } catch (err) {
      setNftError(classifyTransactionError(err));
    } finally {
      setNftSending(false);
    }
  }, [nft, recipient, nftSending, sendNft]);

  // ---------------------------------------------------------------- token ---
  const isSending = sendHook.status === 'creating' || sendHook.status === 'sending';
  const sendFailed = sendHook.status === 'failed';
  const outcomeUnknown = sendHook.error === 'transaction.errors.broadcastUnknown';

  // One wait spans the whole commit, signature through settle.
  const isCommitted = isSending || sendHook.settling;
  const { held: isWaveHeld, onExited: onWaveGone } = useWaitExit(isCommitted);
  const showWait = isCommitted || (isWaveHeld && !!txId);

  // The receipt waits for the wave's report, then takes the review's place.
  const navigatedRef = useRef(false);
  useEffect(() => {
    if (!txId || isWaveHeld || navigatedRef.current) return;
    navigatedRef.current = true;
    setStepped(true);
    setStep('success');
  }, [txId, isWaveHeld]);

  // Once signed, this screen is the only place the user learns whether their
  // money moved, so ambient navigation must not discard it.
  const ownsScreen = isCommitted || nftSending || step === 'success';
  useEffect(() => {
    onFlowLockChange?.(ownsScreen);
    return () => onFlowLockChange?.(false);
  }, [ownsScreen, onFlowLockChange]);

  const goToStep = useCallback((next: SendStep) => {
    setStepped(true);
    setStep(next);
  }, []);

  /** Leave the flow: drop its state and go back to the wallet. */
  const handleLeave = useCallback(() => {
    flow.reset();
    onBack();
  }, [flow, onBack]);

  const finalTxId = nft ? nftTxId : txId;
  const handleContinue = useCallback(() => {
    if (finalTxId) onSuccess?.(finalTxId);
    flow.reset();
    onBack();
  }, [finalTxId, onSuccess, flow, onBack]);

  const handleRecipientContinue = useCallback(
    (next: SendRecipient) => {
      setRecipient(next);
      goToStep(nft ? 'review' : 'amount');
    },
    [setRecipient, goToStep, nft]
  );

  // A token picked on review may not cover the amount already typed: the fee
  // re-estimates itself, but the amount is the one thing review cannot fix.
  const handleReviewSelectToken = useCallback(
    (next: SendToken) => {
      setToken(next);
      const numAmount = parseFloat(amount);
      const nextBalance =
        typeof next.uiAmount === 'string' ? parseFloat(next.uiAmount) : (next.uiAmount ?? 0);
      if (!isNaN(numAmount) && numAmount > nextBalance) goToStep('amount');
    },
    [setToken, amount, goToStep]
  );

  // The failure surface floats up into the space the wave left.
  const failureRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sendFailed) floatEntering(failureRef.current, reducedMotion);
  }, [sendFailed, reducedMotion]);

  const summary = useMemo(
    () =>
      token && recipient
        ? t('transaction.sendSummary', {
            amount,
            symbol: token.symbol,
            recipient: getShortAddress(recipient.address) ?? recipient.address,
          })
        : '',
    [token, recipient, amount, t]
  );

  // The receipt owns its own arrival; the first step is simply there.
  const entranceless = !stepped || step === 'success';

  return (
    <div style={{ ...stepFrame, position: 'relative' }} data-testid="send-page">
      <SinkFloat transitionKey={step} floatMs={entranceless ? 0 : undefined} style={stepFrame}>
        {step === 'recipient' && (
          <StepRecipient
            account={account}
            networkId={networkId}
            recipient={recipient}
            onContinue={handleRecipientContinue}
            onBack={handleLeave}
            token={token}
            tokens={tokens}
            tokensLoading={loading}
            liveBalance={flow.liveBalance}
            onSelectToken={setToken}
            nft={nft}
          />
        )}

        {step === 'amount' && token && recipient && (
          <StepAmount
            blockchain={blockchain}
            token={token}
            liveBalance={flow.liveBalance}
            nativeBalance={flow.nativeBalance}
            recipient={recipient}
            amount={amount}
            setAmount={setAmount}
            estimatedFee={flow.estimatedFee}
            estimateFee={flow.estimateFee}
            onReview={() => goToStep('review')}
            onBack={() => goToStep('recipient')}
          />
        )}

        {step === 'review' && recipient && (
          <StepReview
            recipient={recipient}
            onBack={() => goToStep(nft ? 'recipient' : 'amount')}
            onCancel={handleLeave}
            onConfirm={nft ? () => void submitNft() : () => void submit()}
            isSending={nft ? nftSending : isSending}
            token={token}
            tokens={tokens}
            tokensLoading={loading}
            amount={amount}
            estimatedFee={flow.estimatedFee}
            estimateFee={flow.estimateFee}
            feeEstimateFailed={sendHook.feeEstimateFailed}
            onSelectToken={handleReviewSelectToken}
            nft={nft}
            nftError={nftError}
          />
        )}

        {step === 'success' && finalTxId && recipient && (
          <StepSuccess
            account={account}
            blockchain={blockchain}
            txId={finalTxId}
            recipient={recipient}
            onContinue={handleContinue}
            settling={nft ? nftSettling : false}
            token={token}
            amount={amount}
            nft={nft}
          />
        )}
      </SinkFloat>

      {/* The wave wait, in its own window above every piece of chrome. */}
      {showWait && (
        <LoadingScreen
          visible={isCommitted}
          waves
          title={t('transaction.pendingSend')}
          subtitle={summary}
          onExited={onWaveGone}
        />
      )}

      {/* The failure, on the very surface the wait was standing on. */}
      {sendFailed && (
        <div
          data-testid="send-failure-surface"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: semantic.depth.column,
          }}
        >
          <DepthBackground style={{ zIndex: 0 }} />
          <ScalesBackground variant="deepField" style={{ zIndex: 0 }} />
          <div
            ref={failureRef}
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <SendFailure
              title={t(outcomeUnknown ? 'transaction.sendUnconfirmed' : 'transaction.sendFailed')}
              message={t(sendHook.error ?? 'transaction.errors.generic')}
              retryLabel={t('actions.retry')}
              dismissLabel={t('transaction.continue')}
              onRetry={() => void submit()}
              onDismiss={handleLeave}
            />
          </div>
        </div>
      )}
    </div>
  );
}
