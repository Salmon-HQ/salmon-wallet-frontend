import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { BlurTargetView } from 'expo-blur';
import { Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import {
  useAccountsContext,
  useUserConfig,
  colors,
  semantic,
  getStashItem,
} from '@salmon/shared';
import {
  DepthBackground,
  ScalesBackground,
  BlurTargetProvider,
  LockOverlay,
  LockContent,
} from '../../../src/components';
import { useBiometricAuth } from '../../../hooks/useBiometricAuth';
import { DeveloperModeProvider } from '../../../src/contexts/DeveloperModeContext';
import { TaskChromeProvider } from '../../../src/contexts/TaskChromeContext';
import type { DerivedKeyCache } from '@salmon/shared';
import { FLOAT_DELAY_MS } from '../../../src/utils/sinkAndFloat';

/**
 * Tab Layout for Salmon Wallet
 *
 * Renders the shared chrome once for all tabs: the water column and the lock
 * overlay. The wallet header row belongs to Home alone — it is that screen's
 * identity line, and mounted here it painted over the title of every screen
 * pushed on top (owner, on device). Settings and Wallets are stack screens of
 * their own.
 */
export default function TabLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const blurTargetRef = useRef<View>(null);

  const [accountState, accountActions] = useAccountsContext();
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

  const {
    state: biometricState,
    enableBiometric,
    setEnableBiometric,
    authenticateWithBiometric,
    storeKeyForBiometric,
    refreshState: refreshBiometricState,
  } = useBiometricAuth();

  // The parked unlock release. A password unlock flips `locked` the instant the
  // crypto resolves, and unmounting the overlay takes the unlock wait with it,
  // cutting its wave mid-crossing. The hold keeps the overlay mounted until
  // LockContent reports the wave has left the screen (`onUnlockExited`,
  // watchdog-backed), the same parked pattern the password screen uses.
  const [unlockHeld, setUnlockHeld] = useState(false);
  const isReduceMotionEnabled = useReducedMotion();
  const unlockReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (unlockReleaseTimer.current !== null) clearTimeout(unlockReleaseTimer.current);
    },
    []
  );

  const isLocked = accountState.locked || unlockHeld;

  const handleLockUnlock = useCallback(
    async (password: string): Promise<boolean> => {
      // Held *before* the await: `locked` flips inside unlockAccounts, in an
      // earlier microtask than any state set after it, so holding afterwards
      // leaves one frame where the overlay is gone and the wait unmounts.
      setUnlockHeld(true);
      try {
        const success = await accountActions.unlockAccounts(password);
        if (!success) setUnlockHeld(false);
        return success;
      } catch (err) {
        console.error('Unlock failed:', err);
        setUnlockHeld(false);
        return false;
      }
    },
    [accountActions]
  );

  // The unlock passage is sequential: hold → the wait's sink
  // (`onUnlockExited` fires as it completes) → one beat of calm water → the
  // overlay leaves. The beat is `FLOAT_DELAY_MS`, the same pause every sink in
  // this water earns. Under reduce motion the passage is a cut, so the release
  // is immediate.
  const handleUnlockExited = useCallback(() => {
    if (isReduceMotionEnabled) {
      setUnlockHeld(false);
      return;
    }
    if (unlockReleaseTimer.current !== null) clearTimeout(unlockReleaseTimer.current);
    unlockReleaseTimer.current = setTimeout(() => {
      unlockReleaseTimer.current = null;
      setUnlockHeld(false);
    }, FLOAT_DELAY_MS);
  }, [isReduceMotionEnabled]);

  const handleLockUnlockWithKey = useCallback(
    async (keyJson: string): Promise<boolean> => {
      setUnlockHeld(true);
      try {
        const keyCache: DerivedKeyCache = JSON.parse(keyJson);
        const success = await accountActions.unlockWithCachedKey(keyCache);
        setUnlockHeld(false);
        return success;
      } catch (error) {
        console.error('Biometric unlock failed:', error);
        setUnlockHeld(false);
        return false;
      }
    },
    [accountActions]
  );

  const handleGetDerivedKey = useCallback(async (): Promise<string | null> => {
    try {
      const keyCache = await getStashItem<DerivedKeyCache>('derived_key_cache');
      return keyCache ? JSON.stringify(keyCache) : null;
    } catch {
      return null;
    }
  }, []);

  const handleRemoveAllAccountsFromLock = useCallback(async () => {
    await setEnableBiometric(false);
    await accountActions.removeAllAccounts();
    router.replace('/(auth)');
  }, [accountActions, router, setEnableBiometric]);

  const lockBiometricConfig = React.useMemo(
    () => ({
      state: biometricState,
      authenticateWithBiometric,
      storeKeyForBiometric,
      enableBiometric,
      refreshState: refreshBiometricState,
    }),
    [
      biometricState,
      authenticateWithBiometric,
      storeKeyForBiometric,
      enableBiometric,
      refreshBiometricState,
    ]
  );

  return (
    <TaskChromeProvider>
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
              <Tabs.Screen
                name="settings"
                options={{ href: null, title: t('tabs.settings', 'Settings') }}
              />
            </Tabs>
          </BlurTargetProvider>
        </DeveloperModeProvider>

        {/* The lock screen. It covers everything and takes every touch. */}
        {isLocked && (
          <LockOverlay>
            <LockContent
              locked={accountState.locked}
              onUnlock={handleLockUnlock}
              onUnlockWithKey={handleLockUnlockWithKey}
              onGetDerivedKey={handleGetDerivedKey}
              onUnlockExited={handleUnlockExited}
              onRemoveAllAccounts={handleRemoveAllAccountsFromLock}
              biometric={lockBiometricConfig}
            />
          </LockOverlay>
        )}
      </View>
    </TaskChromeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  bottomFadeGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 180,
    bottom: 0,
  },
});
