import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAccountsContext, isWatchOnlyAccount, spacing } from '@salmon/shared';
import { useSwapScreenLogic } from '@salmon/shared/powerups';
import { useTranslation } from 'react-i18next';
import { SwapInputScreen } from './SwapInputScreen';
import { StateBlock } from '../StateBlock';
import { TokenSelectorModal } from '../TokenSelector';
import { WarningNotice } from '../WarningNotice';
import type { SwapScreenProps } from './types';

/**
 * SwapScreen - the Swap Powerup on React Native: the form, and only the form.
 *
 * Review, signing and the receipt are not here. "Swap" hands core a proposal;
 * core opens its own confirmation window over this screen
 * (`ConfirmationHost`), signs, broadcasts and shows the receipt there. When
 * the user closes it the swap is over and Home returns to Portfolio
 * (`onNavigateHome`) — this screen never draws an ending of its own (spec 027
 * §2, owner ruling 2026-09-11).
 */
export const SwapScreen: React.FC<SwapScreenProps> = (props) => {
  const { style, ...logicParams } = props;
  const { t } = useTranslation();

  // A watch-only wallet holds no key, so nothing here can be signed. The
  // refusal lives on the screen, not on the entry that used to hide it, so a
  // deep link or a restored route meets the same answer.
  const [{ activeAccount }] = useAccountsContext();
  const isWatchOnly = isWatchOnlyAccount(activeAccount);

  const logic = useSwapScreenLogic(logicParams);

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
      <SwapInputScreen
        inToken={logic.inToken}
        outToken={logic.outToken}
        inAmount={logic.inAmount}
        outAmount={logic.outAmount}
        onInAmountChange={logic.setInAmount}
        onInTokenPress={() => logic.setShowInTokenModal(true)}
        onOutTokenPress={() => logic.setShowOutTokenModal(true)}
        inUsdValue={logic.inUsdValue}
        outUsdValue={logic.outUsdValue}
        isLoadingQuote={logic.isLoadingQuote}
        canSwap={logic.canSwap}
        reviewWarning={logic.reviewWarning}
        swapError={logic.swapError}
        attribution={logic.attribution}
        onSwap={() => void logic.handleSwap()}
      />

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
  centeredContainer: {
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  watchOnlyNotice: {
    marginBottom: spacing.lg,
  },
});

export default SwapScreen;
