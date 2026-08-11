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
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import {
  useSendTransaction,
  getTransactionUrl,
  getDefaultExplorer,
  getShortAddress,
} from '@salmon/shared';
import type { Blockchain, NetworkEnvironment } from '@salmon/shared';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../PageShell';
import { StepTokenSelect } from './StepTokenSelect';
import { StepAddressAmount } from './StepAddressAmount';
import { StepConfirmation } from './StepConfirmation';
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
}: SendPageProps) {
  // Bitcoin has only one token (BTC), so skip token selection
  const skipTokenSelect = blockchain === 'bitcoin';

  // Step management
  const [step, setStep] = useState<SendStep>(
    skipTokenSelect ? 'address-amount' : 'token-select'
  );
  const [selectedToken, setSelectedToken] = useState<SendToken | null>(
    skipTokenSelect && tokens.length > 0 ? tokens[0] : null
  );
  const [recipientAddress, setRecipientAddress] = useState('');
  const [resolvedRecipientAddress, setResolvedRecipientAddress] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState('');
  const [successTxId, setSuccessTxId] = useState<string | null>(null);

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

  // Send hook
  const sendHook = useSendTransaction({ account, blockchain });

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
  }, [skipTokenSelect, tokens]);

  // Exit handler (navigates back to home)
  const handleExit = useCallback(() => {
    sendHook.reset();
    onBack();
  }, [onBack, sendHook]);

  // Step navigation handlers
  const handleSelectToken = useCallback((token: SendToken) => {
    setSelectedToken(token);
    setStep('address-amount');
  }, []);

  const handleBackToTokenSelect = useCallback(() => {
    setStep('token-select');
  }, []);

  const handleReview = useCallback((address: string, amt: string, resolvedAddress?: string) => {
    setRecipientAddress(address);
    setResolvedRecipientAddress(resolvedAddress);
    setAmount(amt);
    setStep('confirmation');
  }, []);

  const handleBackToAddressAmount = useCallback(() => {
    setStep('address-amount');
    sendHook.reset();
  }, [sendHook]);

  const handleSuccess = useCallback((txId: string) => {
    setSuccessTxId(txId);
    setStep('success');
  }, []);

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
  }, [step, skipTokenSelect, handleSuccessContinue, handleBackToAddressAmount, handleBackToTokenSelect, handleExit]);

  return (
    <PageShell
      title={t('token.action.send')}
      onBack={handleBackPress}
      showScalesBackground
      scalesBackgroundProps={{
        strokeColor: 'rgba(255, 255, 255, 0.03)',
        strokeWidth: 1,
        patternHeight: 26,
        style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
      }}
    >
      <ContentArea>
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
            blockchain={blockchain}
            account={account}
            onBack={handleBackToTokenSelect}
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

        {step === 'success' && successTxId && selectedToken && (
          <TransactionSuccessScreen
            title={t('transaction.sendComplete')}
            pendingTitle={t('transaction.pendingSend')}
            summary={`${amount} ${selectedToken.symbol} to ${getShortAddress(recipientAddress) ?? recipientAddress}`}
            explorerUrl={getTransactionUrl(
              blockchain.toUpperCase() as Blockchain,
              (account as { network: { networkId: string } }).network.networkId as NetworkEnvironment,
              getDefaultExplorer(blockchain.toUpperCase() as Blockchain),
              successTxId
            )}
            onContinue={handleSuccessContinue}
            settling={sendHook.settling}
          />
        )}
      </ContentArea>
    </PageShell>
  );
}
