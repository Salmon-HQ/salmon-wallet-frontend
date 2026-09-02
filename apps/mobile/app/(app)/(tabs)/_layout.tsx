import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useAccountsContext, useUserConfig, type Semantic } from '@salmon/shared';
import { DepthBackground, ScalesBackground, BlurTargetProvider } from '../../../src/components';
import { DeveloperModeProvider } from '../../../src/contexts/DeveloperModeContext';
import { useSemantic, useThemedStyles, useThemeMode } from '../../../src/theme/useThemedStyles';
import { useDeveloperNetworksOff } from '../../../hooks/useDeveloperNetworksOff';

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
 * Its own colour follows the mode: the ground is the water ramp's floor and
 * the bottom fade ends on that same floor, so the shell can never paint a
 * dark band across a pale screen the way the static dark tokens did.
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
  const mode = useThemeMode();
  const styles = useThemedStyles(stylesFor);
  const { water } = useSemantic();
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
  const { developerNetworks, toggleDeveloperNetworks } = useUserConfig({
    activeBlockchainAccount: userConfigAccount,
  });

  // The feature is switched off; a stale `true` in storage is flipped back.
  useDeveloperNetworksOff(developerNetworks, toggleDeveloperNetworks);

  return (
    <View style={styles.container}>
      {/* The tab shell mounts its own bar because it is the screen the status
          bar sits directly on the water for. The style follows the mode: a
          hardcoded `light` left the clock white on the pale ground (owner, on
          device). */}
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

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

        {/* Layer 3: Bottom fade gradient. It starts and ends on the ramp's own
            floor — `'transparent'` is black at alpha 0, which smudged the fade
            grey on its way to nothing. */}
        <LinearGradient
          colors={water.fadeBottom}
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

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // The ramp's floor: what the shell shows anywhere the column does not
      // reach is the deepest water, not a separate ground.
      backgroundColor: t.water.gradient[1],
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
