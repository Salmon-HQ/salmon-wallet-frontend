/**
 * SwapRoute — the Swap Powerup's screen, a screen of the `(app)` stack.
 *
 * Reached from the Powerups catalogue (`app/(app)/swap.tsx` re-exports this
 * through `src/powerups`, the entry the build flag aliases). The screen owns
 * the form and the receipt; the confirmation and the signature are core's,
 * opened over this screen by `ConfirmationHost` (spec 027 §2).
 *
 * Solana mainnet only: the build endpoint serves nothing else, and the screen
 * says so instead of quoting a chain the user is not on.
 */
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  mapToSwapToken,
  searchTokens,
  unifiedToSwapToken,
  useAccountsContext,
  useCurrencyContext,
  useJupiterTokenList,
  useMultiChainTokens,
  type SwapNetworkId,
  type SwapToken,
} from '@salmon/shared';
import { SWAP_NETWORK_ID } from '@salmon/shared/powerups';
import { DepthBackground, ScalesBackground, ScreenHeader, StateBlock } from '../components';
import { SwapScreen } from '../components/SwapScreen';

export default function SwapScreenPage() {
  const { t } = useTranslation();
  const router = useRouter();
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
  const { tokens: catalogTokens } = useJupiterTokenList({
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

  const handleNavigateHome = useCallback(() => {
    router.replace('/');
  }, [router]);

  const formatUsd = useCallback((value: number) => `~${formatValue(value)}`, [formatValue]);

  return (
    <View style={styles.container}>
      <DepthBackground />
      <ScalesBackground variant="deepField" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader
          testID="swap-header"
          title={t('swap.catalog.name')}
          onBack={() => router.back()}
        />
        {!ready || !activeAccount || !activeBlockchainAccount ? (
          <View style={styles.centered}>
            <StateBlock tone="empty" title={t('swap.errors.noAccount')} />
          </View>
        ) : (
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
            onNavigateHome={handleNavigateHome}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
});
