/**
 * SwapScreen - Unified swap/bridge interface (Web/Extension)
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Replaces RN Alert with window.alert, uses web TokenSelectorModal.
 */
import React from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import { useSwapScreenLogic, getTransactionUrl, getDefaultExplorer, useBridgeSettlement } from '@salmon/shared';
import type { Blockchain, NetworkEnvironment, NetworkId } from '@salmon/shared';
import { useTranslation } from 'react-i18next';
import { SwapInputScreen } from './SwapInputScreen';
import { SwapReviewScreen } from './SwapReviewScreen';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import { BridgeRecipientScreen } from '../BridgeScreen/BridgeRecipientScreen';
import { BridgeReviewScreen } from '../BridgeScreen/BridgeReviewScreen';
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
  const { style } = props;
  const { t } = useTranslation();

  const { trackBridgeExchange } = useBridgeSettlement();

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
          isLoadingQuote={logic.isLoadingQuote || logic.isLoadingEstimate}
          canReview={logic.canReview}
          reviewWarning={logic.reviewWarning}
          swapError={logic.swapError}
          onReview={logic.handleReview}
        />
      )}

      {logic.step === 'review' && logic.swapMode === 'jupiter' && logic.quote && logic.inToken && logic.outToken && (
        <SwapReviewScreen
          quote={logic.quote}
          inToken={logic.inToken}
          outToken={logic.outToken}
          inAmount={logic.inAmount}
          outAmount={logic.outAmount}
          onBack={logic.handleBackFromReview}
          onConfirm={logic.handleConfirmOrRefresh}
          isConfirming={logic.isConfirming}
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

      {logic.step === 'review' && logic.swapMode === 'stealthex' && logic.bridgeInToken && logic.bridgeOutToken && (
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
          confirmLabel={logic.swapConfirmLabel}
        />
      )}

      {logic.step === 'success' && (
        <TransactionSuccessScreen
          title={logic.successExchange ? t('bridge.initiated', 'Bridge Initiated') : t('transaction.swapComplete')}
          pendingTitle={t('transaction.pendingSwap')}
          summary={`${logic.inAmount} ${logic.inToken?.symbol ?? ''} → ${logic.outAmount} ${logic.outToken?.symbol ?? ''}`}
          explorerUrl={logic.successTxId && logic.inToken?.chain
            ? getTransactionUrl(
                logic.inToken.chain.toUpperCase() as Blockchain,
                (logic.inToken.networkId ?? 'mainnet') as NetworkEnvironment,
                getDefaultExplorer(logic.inToken.chain.toUpperCase() as Blockchain),
                logic.successTxId
              )
            : null
          }
          onContinue={logic.handleSuccessContinue}
          settling={logic.settling}
          bridgeDepositAddress={logic.successExchange?.depositAddress}
          bridgeAmountIn={logic.successExchange ? `${logic.inAmount} ${logic.inToken?.symbol ?? ''}` : undefined}
          bridgeAmountOut={logic.successExchange ? `${logic.successExchange.amountOut} ${logic.outToken?.symbol ?? ''}` : undefined}
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
