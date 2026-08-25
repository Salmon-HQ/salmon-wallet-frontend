/**
 * SendPage - Full-page multi-step send flow
 *
 * Replaces the former SendSheet dialog.
 * Renders as a full page with back navigation, matching the
 * page-navigation pattern used by other extension pages.
 *
 * Content: 3-step send flow (Token Select -> Address & Amount -> Confirmation)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import {
  SOL_CONSTANTS,
  useSendTransaction,
  getTransactionUrl,
  getDefaultExplorer,
  getShortAddress,
  useWaitExit,
} from '@salmon/shared';
import type { Blockchain, NetworkEnvironment } from '@salmon/shared';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../PageShell';
import { SinkFloat } from '../SinkFloat';
import { StepTokenSelect } from './StepTokenSelect';
import { StepAddressAmount } from './StepAddressAmount';
import { StepConfirmation } from './StepConfirmation';
import { LoadingScreen } from '../LoadingScreen';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import type { SendPageProps, SendStep, SendToken } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const ContentArea = styled(Box)({
  minHeight: '100%',
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
});

/**
 * The verb's frame sits between the page's column and the step's own, so it
 * has to be transparent to the layout it was inserted into: the step still
 * owns the corridor (`flex: 1`) and still scrolls inside it (`minHeight: 0`).
 */
const stepFrame: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
};

// ============================================================================
// Component
// ============================================================================

export function SendPage({
  tokens,
  blockchain,
  account,
  onBack,
  onSuccess,
  showUnverifiedTokens,
  loading,
  onFlowLockChange,
}: SendPageProps) {
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
  // Whether a step change has happened since this flow opened. The step on
  // screen floats in only once something has actually moved.
  const [stepped, setStepped] = useState(false);

  const { t } = useTranslation();

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

  // Send hook
  const sendHook = useSendTransaction({ account, blockchain });

  // Two phases, two rules. Before signing, leaving costs nothing and stays
  // easy. Once signed, this screen is the only place the user learns whether
  // their money moved, so ambient navigation must not discard it.
  const isSigning = sendHook.status === 'creating' || sendHook.status === 'sending';
  const isSettling = isSigning || sendHook.settling;
  const ownsScreen = isSettling || step === 'success';

  // The wait between the decision and the receipt (DESIGN.md, §The wait). The
  // canonical wave wait holds the screen while sign/submit/confirm runs and
  // while the indexer settles, then leaves on its own last wave — product,
  // 2026-08: "que no se pase a la siguiente screen hasta que la última onda
  // salga de la pantalla, es decir, justo cuando el agua está calma. Esto
  // aplica siempre." Only once `useWaitExit` reports the water is calm may the
  // receipt mount. Same mechanism the swap screen uses on this platform.
  const { held: isWaveHeld, onExited: onWaveGone } = useWaitExit(isSettling);
  // Keep the wave through its own exit on the way to the receipt. A failure is
  // the exception: the flow stays on confirmation (the error surfaces there),
  // so the wave is not held.
  const showWave = isSettling || (isWaveHeld && step === 'success');

  useEffect(() => {
    onFlowLockChange?.(ownsScreen);
    return () => onFlowLockChange?.(false);
  }, [ownsScreen, onFlowLockChange]);

  // Reset state on mount
  useEffect(() => {
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
  }, [skipTokenSelect, tokens]);

  // Exit handler (navigates back to home)
  const handleExit = useCallback(() => {
    sendHook.reset();
    onBack();
  }, [onBack, sendHook]);

  // Step navigation handlers. Every one of them goes through `goToStep`: the
  // step is what changes, and the fact that it changed is what the verb needs
  // to know.
  const goToStep = useCallback((next: SendStep) => {
    setStepped(true);
    setStep(next);
  }, []);

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

  const handleSuccessContinue = useCallback(() => {
    if (successTxId) {
      onSuccess?.(successTxId);
    }
    onBack();
  }, [successTxId, onSuccess, onBack]);

  // Header back button handler
  const handleBackPress = useCallback(() => {
    if (step === 'success') {
      handleSuccessContinue();
    } else if (step === 'confirmation') {
      handleBackToAddressAmount();
    } else if (step === 'address-amount') {
      if (skipTokenSelect) {
        handleExit();
      } else {
        handleBackToTokenSelect();
      }
    } else {
      // token-select step: go back to home
      handleExit();
    }
  }, [
    step,
    skipTokenSelect,
    handleSuccessContinue,
    handleBackToAddressAmount,
    handleBackToTokenSelect,
    handleExit,
  ]);

  // A step change inside the open flow speaks the verb (DESIGN.md, §The sink
  // and the float — the transition verb): the step that leaves sinks, the beat
  // passes, and the step that arrives floats up in its place. Back is the
  // mirror, and reduce motion resolves both halves to an instant cut with the
  // step still changing — `SinkFloat` owns that mapping.
  //
  // The page's own arrival is not its content's event. The first step is
  // simply there when the flow opens — `stepped` is what tells the two apart —
  // and a single-token chain, which opens straight on the form, is that same
  // arrival by another route rather than a step that moved.
  //
  // The receipt is the exception on the arriving side. It floats its own bands
  // in reading order (DESIGN.md, §The ending says what happened), so floating
  // the step in as a block would deliver it twice, once whole and once band by
  // band. Only its entrance is dropped: the confirmation under it still sinks
  // away, and the receipt's own sequence is what replaces it.
  //
  // A float of no length is exactly that arrival without an entrance — the
  // content lands where the float would have ended, in the frame it mounts.
  const entranceless = !stepped || step === 'success';

  // What moved, in one line. The wait announces it and the receipt repeats it,
  // so the two read as the same event rather than two reports of it.
  const transferSummary = selectedToken
    ? t('transaction.sendSummary', {
        amount,
        symbol: selectedToken.symbol,
        recipient: getShortAddress(recipientAddress) ?? recipientAddress,
      })
    : '';

  return (
    <PageShell title={t('token.action.send')} onBack={handleBackPress} backDisabled={isSettling}>
      <ContentArea>
        <SinkFloat transitionKey={step} floatMs={entranceless ? 0 : undefined} style={stepFrame}>
          {step === 'token-select' && (
            <StepTokenSelect
              tokens={tokens}
              onSelectToken={handleSelectToken}
              showUnverifiedTokens={showUnverifiedTokens}
              loading={loading}
            />
          )}

          {step === 'address-amount' && selectedToken && (
            <StepAddressAmount
              token={selectedToken}
              liveBalance={liveSelectedBalance}
              nativeBalance={nativeBalance}
              blockchain={blockchain}
              account={account}
              onBack={skipTokenSelect ? undefined : handleBackToTokenSelect}
              onReview={handleReview}
              onCancel={handleExit}
            />
          )}

          {step === 'confirmation' && selectedToken && (
            <StepConfirmation
              token={selectedToken}
              recipientAddress={recipientAddress}
              resolvedRecipientAddress={resolvedRecipientAddress}
              amount={amount}
              blockchain={blockchain}
              account={account}
              onBack={handleBackToAddressAmount}
              onCancel={handleExit}
              onSuccess={handleSuccess}
            />
          )}

          {step === 'success' && successTxId && selectedToken && !isWaveHeld && (
            <TransactionSuccessScreen
              title={t('transaction.sendComplete')}
              pendingTitle={t('transaction.pendingSend')}
              summary={transferSummary}
              explorerUrl={getTransactionUrl(
                blockchain.toUpperCase() as Blockchain,
                (account as { network: { networkId: string } }).network
                  .networkId as NetworkEnvironment,
                getDefaultExplorer(blockchain.toUpperCase() as Blockchain),
                successTxId
              )}
              onContinue={handleSuccessContinue}
              settling={sendHook.settling}
            />
          )}
        </SinkFloat>

        {/* The wave wait. Its overlay covers the viewport, so it stands over
            whatever step is still mounted underneath. It holds while the
            transaction is in flight and leaves on its own last wave; the
            receipt above waits for that report. */}
        {showWave && (
          <LoadingScreen
            visible={isSettling}
            waves
            title={t('transaction.pendingSend')}
            subtitle={transferSummary}
            onExited={onWaveGone}
          />
        )}
      </ContentArea>
    </PageShell>
  );
}
