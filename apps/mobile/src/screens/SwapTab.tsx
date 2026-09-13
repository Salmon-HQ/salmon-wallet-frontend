/**
 * SwapTab — the Swap Powerup's surface on Home.
 *
 * An installed Powerup is a sub-tab beside Portfolio and NFTs, not a screen of
 * its own: this is what Home's content region renders when that tab is active.
 * It owns the form and the receipt; the confirmation and the signature are
 * core's, drawn over the whole app by `ConfirmationHost` (spec 027 §2).
 *
 * Reached only through `src/powerups`, the entry the build flag aliases, so a
 * build with Powerups off never compiles it in.
 *
 * Solana mainnet only: the build endpoint serves nothing else, and the tab is
 * not offered on any other network (the registry's `networks`).
 */
import React, { useCallback, useMemo } from 'react';

import {
  unifiedToSwapToken,
  useAccountsContext,
  useCurrencyContext,
  useMultiChainTokens,
  type SwapToken,
} from '@salmon/shared';
import type { PowerupTabProps } from '../powerups';
import { SwapScreen } from '../components/SwapScreen';

export default function SwapTab({ publicKey, networkId, onNavigateHome }: PowerupTabProps) {
  const [, { formatValue }] = useCurrencyContext();

  // The account is Home's gate; this reads it only for the token list.
  const [{ activeAccount }] = useAccountsContext();

  const { tokens: multiChainTokens, loading } = useMultiChainTokens({
    activeAccount,
    skip: !activeAccount,
  });

  const swapTokens: SwapToken[] = useMemo(
    () => multiChainTokens.filter((token) => token.chain === 'solana').map(unifiedToSwapToken),
    [multiChainTokens]
  );

  const formatUsd = useCallback((value: number) => `~${formatValue(value)}`, [formatValue]);

  return (
    <SwapScreen
      tokens={swapTokens}
      loading={loading}
      publicKey={publicKey}
      networkId={networkId}
      initialInToken={swapTokens[0]}
      formatUsd={formatUsd}
      onNavigateHome={onNavigateHome}
    />
  );
}
