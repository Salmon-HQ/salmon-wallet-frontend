import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useAccountsContext, useUserConfig, semantic } from '@salmon/shared';
import { DepthBackground, ScalesBackground, BlurTargetProvider } from '../../../src/components';
import { DeveloperModeProvider } from '../../../src/contexts/DeveloperModeContext';

/**
 * Tab Layout for Salmon Wallet
 *
 * Renders the shared chrome once for all tabs: the water column. The wallet
 * header row belongs to Home alone — it is that screen's identity line, and
 * mounted here it painted over the title of every screen pushed on top
 * (owner, on device). Settings and Wallets are stack screens of their own —
 * Settings included: it lived here as a hidden tab and got no push
 * transition, and it now sits on the `(app)` stack next to Wallets.
 *
 * The lock overlay is NOT mounted here — it lives in `(app)/_layout.tsx`, a
 * level up, because a screen pushed on the `(app)` stack (Wallets, Activity,
 * Settings) sits above this layout and an overlay mounted here would sit
 * behind it. `TaskChromeProvider` moved up for the same reason: the powerups
 * FAB now mounts beside that overlay, outside the tabs, and still has to
 * leave when a task engages.
 */
export default function TabLayout() {
  const { t } = useTranslation();
  const blurTargetRef = useRef<View>(null);

  const [accountState] = useAccountsContext();
  const { activeBlockchainAccount, networkId } = accountState;

  const userConfigAccount = activeBlockchainAccount
    ? {
        network: {
          environment: (networkId || 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
          blockchain: 'solana',
        },
      }
    : {
        network: {
          environment: 'solana-mainnet' as const,
          blockchain: 'solana',
        },
      };
  const { developerNetworks } = useUserConfig({ activeBlockchainAccount: userConfigAccount });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background layers wrapped in BlurTargetView for Android blur targeting */}
      <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill}>
        {/* Layer 1: the water column — a depth ramp that darkens toward the
            bottom. Edge to edge, to the physical top of the screen: the status
            bar sits ON the water, not on a band painted over it. There used to
            be an opaque `topSafeAreaOverlay` the height of the top inset here,
            which cut the scales off in a straight line under the notch. */}
        <DepthBackground />

        {/* Layer 2: the deep field. It belongs here and only here — on the
            ground, in the same plane as the ramp. */}
        <ScalesBackground variant="deepField" />

        {/* Layer 3: Bottom fade gradient. Ends on the ramp's own floor rather
            than the old flat ground, which would have lightened the abyss. */}
        <LinearGradient
          colors={['transparent', semantic.water.gradient[1]]}
          style={styles.bottomFadeGradient}
          pointerEvents="none"
        />
      </BlurTargetView>

      {/* Tab screens fill the remaining space */}
      <DeveloperModeProvider value={{ developerNetworks }}>
        <BlurTargetProvider value={blurTargetRef}>
          <Tabs
            tabBar={() => null}
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          >
            <Tabs.Screen name="index" options={{ title: t('tabs.home', 'Home') }} />
            <Tabs.Screen
              name="swap"
              options={{
                title: t('tabs.swap', 'Swap'),
                href: null,
              }}
            />
          </Tabs>
        </BlurTargetProvider>
      </DeveloperModeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.depth.abyss,
  },
  bottomFadeGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    // No componentSizes token fits this fade's height (research-mobile.md §3d).
    height: 180,
    bottom: 0,
  },
});
