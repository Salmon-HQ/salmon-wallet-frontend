import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getTransactionUrl,
  getDefaultExplorer,
  formatEffectiveRate,
  useAccountsContext,
  isWatchOnlyAccount,
  spacing,
} from '@salmon/shared';
import type { Blockchain, NetworkEnvironment } from '@salmon/shared';
import { useSwapScreenLogic } from '@salmon/shared/powerups';
import { useTranslation } from 'react-i18next';
import { SwapInputScreen } from './SwapInputScreen';
import { StateBlock } from '../StateBlock';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import { TokenSelectorModal } from '../TokenSelector';
import { WarningNotice } from '../WarningNotice';
import { FLOAT_DELAY_MS, floatEntering, sinkExiting } from '../../utils/sinkAndFloat';
import type { SwapScreenProps } from './types';

/**
 * SwapScreen - the Swap Powerup on React Native: the form and the receipt.
 *
 * Review and signing are not here. "Swap" hands core a proposal; core opens
 * its own confirmation window over this screen (`ConfirmationHost`), signs
 * and broadcasts, and the receipt below renders once the signature is back
 * (spec 027 §2).
 */
export const SwapScreen: React.FC<SwapScreenProps> = (props) => {
  const { style, ...logicParams } = props;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // A watch-only wallet holds no key, so nothing here can be signed. The
  // refusal lives on the screen, not on the entry that used to hide it, so a
  // deep link or a restored route meets the same answer.
  const [{ activeAccount }] = useAccountsContext();
  const isWatchOnly = isWatchOnlyAccount(activeAccount);

  const isReduceMotionEnabled = useReducedMotion();
  const logic = useSwapScreenLogic(logicParams);

  // Success renders from the confirm-time snapshot: post-swap balance
  // refreshes can drop the spent input token from the list and mutate the
  // live form state while the receipt is still mounted.
  const summary = logic.successSummary;
  const successInLabel = summary
    ? `${summary.inAmount} ${summary.inSymbol}`
    : `${logic.inAmount} ${logic.inToken?.symbol ?? ''}`;
  const successOutLabel = summary
    ? `${summary.outAmount} ${summary.outSymbol}`
    : `${logic.outAmount} ${logic.outToken?.symbol ?? ''}`;
  const successInSymbol = summary ? summary.inSymbol : (logic.inToken?.symbol ?? '');
  const successOutSymbol = summary ? summary.outSymbol : (logic.outToken?.symbol ?? '');
  const successChain = summary ? summary.chain : logic.inToken?.chain;
  const successNetworkId = summary ? summary.networkId : logic.inToken?.networkId;
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
      symbol: successOutSymbol,
      amount: successOutLabel,
    },
  };
  const successRate =
    formatEffectiveRate(
      summary?.inAmount ?? logic.inAmount,
      successInSymbol,
      summary?.outAmount ?? logic.outAmount,
      successOutSymbol
    ) ?? undefined;

  // A step change speaks the sink and the float: the form sinks as its light
  // goes, the receipt arrives whole (DESIGN.md §The receipt) — but only when
  // something actually sank, never on first mount. Under reduce motion every
  // change is a cut.
  const [stepSwap, setStepSwap] = useState({ step: logic.step, hasPrior: false });
  if (stepSwap.step !== logic.step) {
    setStepSwap({ step: logic.step, hasPrior: true });
  }
  const stepDelayMs = stepSwap.hasPrior ? FLOAT_DELAY_MS : 0;
  const stepEntering = floatEntering(isReduceMotionEnabled, { delayMs: stepDelayMs });
  const stepExiting = sinkExiting(isReduceMotionEnabled);

  // Same refusal the home screen shows beside its disabled Send: one
  // explanation, not a tooltip per control.
  if (isWatchOnly) {
    return (
      <View
        testID="swap-watch-only-notice"
        style={[styles.container, styles.centeredContainer, style]}
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

  // Fail closed: off mainnet, or refused by the backend for this region or
  // wallet, the screen says so and quotes nothing (spec 027 §4–5).
  if (logic.unavailable) {
    return (
      <View style={[styles.container, styles.centeredContainer, style]}>
        <StateBlock
          testID={`swap-unavailable-${logic.unavailable}`}
          tone="empty"
          title={t(`swap.unavailable.${logic.unavailable}`)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
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
            isLoadingQuote={logic.isLoadingQuote}
            canSwap={logic.canSwap}
            reviewWarning={logic.reviewWarning}
            swapError={logic.swapError}
            attribution={logic.attribution}
            onSwap={() => void logic.handleSwap()}
          />
        </Animated.View>
      )}

      {logic.step === 'success' && (
        <View style={[styles.step, { paddingBottom: insets.bottom + spacing.lg }]}>
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
            settling={logic.settling}
            pendingTitle={t('transaction.pendingSwap')}
            exchange={successExchangeBlock}
            exchangeRate={successRate}
            exchangeFee={summary?.fee}
          />
        </View>
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
        // You Receive: what you already hold is noise when choosing what to get.
        showBalances={false}
        loading={logic.tokensLoading}
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
  centeredContainer: {
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  watchOnlyNotice: {
    marginBottom: spacing.lg,
  },
});

export default SwapScreen;
