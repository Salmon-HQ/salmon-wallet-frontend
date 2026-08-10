import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  BackHandler,
} from 'react-native';
import {
  useSendTransaction,
  getTransactionUrl,
  getDefaultExplorer,
  getShortAddress,
} from '@salmon/shared';
import type { Blockchain, NetworkEnvironment } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

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
  const [resolvedRecipientAddress, setResolvedRecipientAddress] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState('');
  const [successTxId, setSuccessTxId] = useState<string | null>(null);
  const previousVisibleRef = useRef(visible);

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
    sendHook.reset();
  }, [sendHook, skipTokenSelect, tokens]);

  // Handle close; state reset is driven by the visible -> false transition so
  // external closes (for example, on lock) clear the flow too.
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const wasVisible = previousVisibleRef.current;
    previousVisibleRef.current = visible;

    if (!visible && wasVisible) {
      const timer = setTimeout(() => {
        resetFlowState();
      }, ANIMATION_DURATION);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [visible, resetFlowState]);

  const handleSuccessContinue = useCallback(() => {
    if (successTxId) {
      onSuccess?.(successTxId);
    }
    handleClose();
  }, [successTxId, onSuccess, handleClose]);

  // Handle Android back button (step-aware)
  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (step === 'success') {
          handleSuccessContinue();
        } else if (step === 'confirmation') {
          setStep('address-amount');
        } else if (step === 'address-amount' && !skipTokenSelect) {
          setStep('token-select');
        } else {
          handleClose();
        }
        return true;
      }
    );

    return () => backHandler.remove();
  }, [visible, step, skipTokenSelect, handleClose, handleSuccessContinue]);

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

  // Back button handler for the header
  const handleBackPress = useCallback(() => {
    if (step === 'confirmation') {
      handleBackToAddressAmount();
    } else if (step === 'address-amount') {
      if (skipTokenSelect) {
        handleClose();
      } else {
        handleBackToTokenSelect();
      }
    }
  }, [step, skipTokenSelect, handleBackToAddressAmount, handleBackToTokenSelect, handleClose]);

  const showBackButton = step !== 'token-select' || skipTokenSelect;
  const showHeader = step !== 'success';

  const headerContent = (
    <BottomSheetTitleHeader
      title="Send"
      onBack={showBackButton ? handleBackPress : undefined}
      backAccessibilityLabel={t('general.back', 'Back')}
    />
  );

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={handleClose}
      headerContent={showHeader ? headerContent : undefined}
      style={style}
    >
      {/* Content */}
      <View style={styles.content}>
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
            onCancel={handleClose}
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
            onCancel={handleClose}
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
              account.getNetworkId() as NetworkEnvironment,
              getDefaultExplorer(blockchain.toUpperCase() as Blockchain),
              successTxId
            )}
            onContinue={handleSuccessContinue}
            settling={sendHook.settling}
          />
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
});

export default SendSheet;
