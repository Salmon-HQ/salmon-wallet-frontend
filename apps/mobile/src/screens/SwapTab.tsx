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
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  mapToSwapToken,
  searchTokens,
  unifiedToSwapToken,
  useAccountsContext,
  useCurrencyContext,
  useTokenCatalog,
  useMultiChainTokens,
  type SwapNetworkId,
  type SwapToken,
} from '@salmon/shared';
import { SWAP_NETWORK_ID } from '@salmon/shared/powerups';
import { StateBlock } from '../components';
import { SwapScreen } from '../components/SwapScreen';

export default function SwapTab() {
  const { t } = useTranslation();
  const [, { formatValue }] = useCurrencyContext();

  const [accountState] = useAccountsContext();
  const { ready, activeAccount, activeBlockchainAccount, networkId } = accountState;

  const {
    tokens: multiChainTokens,
    featuredTokens: topTokens,
    loading,
  } = useMultiChainTokens({
    activeAccount,
    skip: !ready || !activeAccount,
  });

  const swapTokens: SwapToken[] = useMemo(
    () => multiChainTokens.filter((token) => token.chain === 'solana').map(unifiedToSwapToken),
    [multiChainTokens]
  );
  const featuredTokens: SwapToken[] = useMemo(
    () => topTokens.filter((token) => token.chain === 'solana').map(unifiedToSwapToken),
    [topTokens]
  );

  // The verified catalogue for the output side (shared React Query hook).
  const { tokens: catalogTokens } = useTokenCatalog({
    networkId: SWAP_NETWORK_ID as SwapNetworkId,
  });

  const handleSearchTokens = useCallback(async (query: string): Promise<SwapToken[]> => {
    try {
      const results = await searchTokens(query, SWAP_NETWORK_ID);
      return results.map((token) => mapToSwapToken(token));
    } catch (error) {
      console.error('Token search failed:', error);
      return [];
    }
  }, []);

  const formatUsd = useCallback((value: number) => `~${formatValue(value)}`, [formatValue]);

  if (!ready || !activeAccount || !activeBlockchainAccount) {
    return (
      <View style={styles.centered}>
        <StateBlock tone="empty" title={t('swap.errors.noAccount')} />
      </View>
    );
  }

  return (
    <SwapScreen
      tokens={swapTokens}
      featuredTokens={featuredTokens}
      catalogTokens={catalogTokens}
      loading={loading}
      publicKey={activeBlockchainAccount.getReceiveAddress()}
      networkId={networkId ?? null}
      onSearchTokens={handleSearchTokens}
      initialInToken={swapTokens[0]}
      formatUsd={formatUsd}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
});
