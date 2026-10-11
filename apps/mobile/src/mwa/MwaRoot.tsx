import { isSignableSolanaAccount, useAccountsContext } from '@salmon/shared';
import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, BackHandler, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LockContent } from '../components/LockOverlay';
import { DepthBackground } from '../components/DepthBackground';
import { useBiometric } from '../contexts/BiometricContext';
import { I18nProvider } from '../i18n';
import { AppProviders, useAppFonts } from '../providers/AppProviders';
import { MwaRequest } from './MwaRequest';
import {
  isSeedVaultScreenOpen,
  onSeedVaultScreensClosed,
  SEED_VAULT_CLOSE_SETTLE_MS,
} from '../seed-vault/bridge';
import { useMwaSession } from './useMwaSession';

/**
 * The React root of `MwaActivity`: a dApp asked for Salmon through Mobile
 * Wallet Adapter. It shares the wallet's providers and lock with the app, but
 * not its navigator — the approval sits over the dApp and closes back to it.
 */
export function MwaRoot() {
  // A font that fails to load must not leave the dApp waiting on a blank sheet.
  const [fontsLoaded, fontError] = useAppFonts();
  if (!fontsLoaded && !fontError) return null;

  return (
    <AppProviders>
      <I18nProvider>
        <GestureHandlerRootView style={styles.fill}>
          <SafeAreaProvider>
            <MwaHost />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </I18nProvider>
    </AppProviders>
  );
}

// Finishing the activity hands the screen back to the dApp.
const close = () => BackHandler.exitApp();
// The dApp's lock offers no reset (`allowReset={false}`); the contract still asks for one.
const noReset = async () => {};

function MwaHost() {
  const [state, actions] = useAccountsContext();
  const biometric = useBiometric();

  // The wallet closes behind every session, as the app locks when it leaves
  // the screen: the next dApp asks for the password again instead of finding
  // the key still in memory.
  const lockAndClose = useCallback(() => {
    actions
      .lockAccounts()
      .catch((error: unknown) => console.warn('[mwa] lock failed', error))
      .finally(close);
  }, [actions]);
  const { current, respond } = useMwaSession({ onEnd: lockAndClose });

  // Leaving the screen any way at all — background, or the activity torn down
  // without a session event — locks as well. `actions` changes identity with
  // the wallet state, so it is read through a ref: an effect keyed on it would
  // run its cleanup, and lock, on the very unlock it should survive.
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      // A Seed Vault confirmation puts its own screen over this one.
      if (next === 'background' && !isSeedVaultScreenOpen()) {
        void actionsRef.current.lockAccounts();
      }
    });
    // Leaving while a Seed Vault screen was on top sends no new event.
    const unsubscribeSeedVault = onSeedVaultScreensClosed(() => {
      setTimeout(() => {
        if (AppState.currentState !== 'active') void actionsRef.current.lockAccounts();
      }, SEED_VAULT_CLOSE_SETTLE_MS);
    });
    return () => {
      subscription.remove();
      unsubscribeSeedVault();
      void actionsRef.current.lockAccounts();
    };
  }, []);

  // Hardware back: a request on screen answers through its own controls (the
  // sheet's back handling, the review's Back button), which know whether
  // signing is under way. Anywhere else — the lock, nothing yet — it closes
  // back to the dApp, and the session declines whatever was waiting.
  const requestOnScreen = !!current && state.ready && !state.locked;
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!requestOnScreen) lockAndClose();
      return true;
    });
    return () => subscription.remove();
  }, [requestOnScreen, lockAndClose]);

  if (!state.ready) return null;

  // An unlocked wallet whose active account has not loaded yet would be judged
  // "watch-only"; wait for it.
  if (!state.locked && state.accounts.length > 0 && !state.activeBlockchainAccount) return null;

  // Nothing is shown to the dApp, and nothing is signed, before the wallet is
  // open: the same password or biometrics the app asks for.
  if (state.locked) {
    return (
      <View style={styles.fill} testID="mwa-lock">
        <DepthBackground />
        <LockContent
          locked
          allowReset={false}
          onUnlock={actions.unlockAccounts}
          onRemoveAllAccounts={noReset}
          biometric={{
            available: biometric.available,
            armed: biometric.armed,
            kind: biometric.kind,
            needsReArm: biometric.needsReArm,
            unlock: biometric.unlock,
            refresh: biometric.refresh,
          }}
        />
      </View>
    );
  }

  if (!current) return null;

  const account = state.activeBlockchainAccount;
  return (
    <MwaRequest
      key={current.requestId}
      request={current}
      respond={respond}
      account={account && isSignableSolanaAccount(account) ? account : null}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
