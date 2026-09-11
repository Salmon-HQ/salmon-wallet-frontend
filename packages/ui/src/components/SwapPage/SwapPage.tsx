/**
 * SwapPage — the Swap Powerup's surface on Home, on the DOM: the form, and
 * only the form. It is a sub-tab of Home, not a screen, so it draws no header
 * and no ground of its own — Home's are already behind it.
 *
 * The mobile twin is `apps/mobile/src/components/SwapScreen` (wired by
 * `src/screens/SwapTab.tsx`). Review, signing and the receipt are not here:
 * "Swap" hands core a proposal through the shared `useSwapScreenLogic`, core
 * covers the page with its confirmation (`ConfirmationHost`), signs,
 * broadcasts and shows the receipt there. Closing it ends the swap and Home
 * returns to Portfolio (spec 027 §2, owner ruling 2026-09-11).
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { spacing, type SendToken, type SwapToken } from '@salmon/shared';
import { useSwapScreenLogic } from '@salmon/shared/powerups';

import { StateBlock } from '../StateBlock';
import { TokenPickerSheet } from '../SendPage/TokenPickerSheet';
import { WarningNotice } from '../WarningNotice';
import { SwapInputScreen } from './SwapInputScreen';
import type { SwapPageProps } from './types';

/** The picker reads the send flow's token shape; a swap token is a subset of it. */
function toPickerToken(token: SwapToken & { mint: string; uiAmount: number }): SendToken {
  return {
    address: token.address,
    name: token.name ?? token.symbol,
    symbol: token.symbol,
    logo: token.logo,
    price: token.usdPrice,
    uiAmount: token.uiAmount,
    decimals: token.decimals,
  };
}

export function SwapPage({ watchOnly = false, style, ...logicParams }: SwapPageProps) {
  const { t } = useTranslation();
  const logic = useSwapScreenLogic(logicParams);

  const inPickerTokens = useMemo(
    () => logic.modalInTokens.map(toPickerToken),
    [logic.modalInTokens]
  );
  const outPickerTokens = useMemo(
    () => logic.modalOutTokens.map(toPickerToken),
    [logic.modalOutTokens]
  );

  const body = (() => {
    if (watchOnly) {
      return (
        <div data-testid="swap-watch-only-notice">
          <WarningNotice tone="warning" title={t('wallet.watchOnly.badge')}>
            {t('wallet.watchOnly.disabled_action')}
          </WarningNotice>
        </div>
      );
    }
    // Fail closed: off mainnet, or refused by the backend for this region or
    // wallet, the page says so and quotes nothing (spec 027 §4–5).
    if (logic.unavailable) {
      return (
        <StateBlock
          testID={`swap-unavailable-${logic.unavailable}`}
          tone="empty"
          title={t(`swap.unavailable.${logic.unavailable}`)}
        />
      );
    }
    return (
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
    );
  })();

  return (
    <div
      data-testid="swap-page"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        ...style,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: `0 ${spacing.screenGutter}px ${spacing.screenGutter}px`,
        }}
      >
        {body}
      </div>

      <TokenPickerSheet
        testID="swap-in-token-picker"
        visible={logic.showInTokenModal}
        onClose={() => logic.setShowInTokenModal(false)}
        tokens={inPickerTokens}
        loading={logic.tokensLoading}
        onSelectToken={(token) =>
          logic.handleInTokenModalSelect({
            mint: token.address,
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            logo: token.logo,
            uiAmount: Number(token.uiAmount),
          })
        }
      />
      <TokenPickerSheet
        testID="swap-out-token-picker"
        visible={logic.showOutTokenModal}
        onClose={() => logic.setShowOutTokenModal(false)}
        tokens={outPickerTokens}
        loading={logic.tokensLoading}
        onSelectToken={(token) =>
          logic.handleOutTokenModalSelect({
            mint: token.address,
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            logo: token.logo,
            uiAmount: Number(token.uiAmount),
          })
        }
      />
    </div>
  );
}
