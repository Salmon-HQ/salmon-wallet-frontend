import { isSignableSolanaAccount, useAccountsContext } from '@salmon/shared';
import React, { useCallback, useEffect } from 'react';
import { AppState, BackHandler, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LockContent } from '../components/LockOverlay';
import { DepthBackground } from '../components/DepthBackground';
import { useBiometric } from '../contexts/BiometricContext';
import { I18nProvider } from '../i18n';
import { AppProviders, useAppFonts } from '../providers/AppProviders';
import { MwaRequest } from './MwaRequest';
import { useMwaSession } from './useMwaSession';

/**
 * The React root of `MwaActivity`: a dApp asked for Salmon through Mobile
 * Wallet Adapter. It shares the wallet's providers and lock with the app, but
 * not its navigator — the approval sits over the dApp and closes back to it.
 */
export function MwaRoot() {
  const [fontsLoaded] = useAppFonts();
  if (!fontsLoaded) return null;

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

function MwaHost() {
  const [state, actions] = useAccountsContext();
  const biometric = useBiometric();

  // The wallet closes behind every session, as the app locks when it leaves
  // the screen: the next dApp asks for the password again instead of finding
  // the key still in memory.
  const lockAndClose = useCallback(() => {
    void actions.lockAccounts().finally(close);
  }, [actions]);
  const { current, respond } = useMwaSession({ onEnd: lockAndClose });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') void actions.lockAccounts();
    });
    return () => subscription.remove();
  }, [actions]);

  const removeAllAccounts = useCallback(async () => {
    await biometric.disarm();
    await actions.removeAllAccounts();
    close();
  }, [actions, biometric]);

  if (!state.ready) return null;

  // Nothing is shown to the dApp, and nothing is signed, before the wallet is
  // open: the same password or biometrics the app asks for.
  if (state.locked) {
    return (
      <View style={styles.fill} testID="mwa-lock">
        <DepthBackground />
        <LockContent
          locked
          onUnlock={actions.unlockAccounts}
          onRemoveAllAccounts={removeAllAccounts}
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
