/**
 * Stake accounts — what Assets' "Staked SOL" row opens (spec 038): each of
 * the wallet's stake accounts with its validator, state and recent rewards.
 * Read-only. DOM twin: `packages/ui/src/components/StakeAccountsPage`.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  s,
  spacing,
  stakeAccountsBlocks,
  useAccountsContext,
  useStakeAccountsScreen,
  vs,
} from '@salmon/shared';

import { DepthBackground, ScalesBackground, BlockList, ScreenHeader } from '../../src/components';

export default function StakingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [{ activeBlockchainAccount, networkId }] = useAccountsContext();
  const { state, cards, refresh } = useStakeAccountsScreen({
    publicKey: activeBlockchainAccount?.getReceiveAddress(),
    networkId: networkId ?? undefined,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <DepthBackground />
      <ScalesBackground variant="deepField" />
      <ScreenHeader
        onBack={() => router.back()}
        title={t('staking.detail.title')}
        subtitle={t('staking.detail.subtitle')}
      />
      <ScrollView testID="staking-screen" contentContainerStyle={styles.body}>
        <BlockList
          testID="stake-accounts"
          blocks={stakeAccountsBlocks({ state, cards, onRetry: () => void refresh() }, t)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { paddingHorizontal: s(spacing.screenGutter), paddingBottom: vs(spacing.screenBottom) },
});
