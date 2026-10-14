import {
  getHeldPathIndex,
  isSignableSolanaAccount,
  mwaDisplayName,
  mwaIdentityOrigin,
  mwaNetworkSwitch,
  useAccountsContext,
} from '@salmon/shared';
import {
  MWARequestFailReason,
  MWARequestType,
  type MWARequest,
  type MWAResponse,
} from '@solana-mobile/mobile-wallet-adapter-walletlib';
import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, BackHandler, Linking, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfirmSheet } from '../components/ConfirmSheet';
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
import { setMwaSessionOpen } from './sessionOpen';
import { useMwaSession } from './useMwaSession';

/**
 * The React root of `MwaActivity`: a dApp asked for Salmon through Mobile
 * Wallet Adapter. It shares the wallet's providers and lock with the app, but
 * not its navigator — the approval sits over the dApp and closes back to it.
 */
export function MwaRoot() {
  // Before fonts, before anything: the app's lock behind this one must hold
  // its biometric prompt from the first frame (see `sessionOpen`).
  useLayoutEffect(() => {
    setMwaSessionOpen(true);
    return () => setMwaSessionOpen(false);
  }, []);

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
const declined: MWAResponse = { failReason: MWARequestFailReason.UserDeclined };
// The app's own scheme, declared on MainActivity: it opens Salmon's first screen.
const SALMON_URL = 'salmonwallet://';
// The dApp's lock offers no reset (`allowReset={false}`); the contract still asks for one.
const noReset = async () => {};

export function MwaHost() {
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

  // No wallet yet: there is nothing to unlock and no network to judge, so the
  // user is told that first, and led to where a wallet is made.
  if (state.accounts.length === 0) {
    return current ? (
      <NoWalletSheet key={current.requestId} respond={respond} onLeave={lockAndClose} />
    ) : null;
  }

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

  // A network Salmon holds but is not on: offer to move there before a connect.
  const switchTo = mwaNetworkSwitch(
    {
      authorize: current.__type === MWARequestType.AuthorizeDappRequest,
      chain: 'chain' in current ? current.chain : undefined,
      identityUri: current.appIdentity?.identityUri,
    },
    state.networkId,
    (networkId) => getHeldPathIndex(state.activeAccount, networkId) !== null
  );
  if (switchTo && state.networkId) {
    return (
      <NetworkSwitchSheet
        key={current.requestId}
        request={current}
        from={state.networkId}
        to={switchTo}
        respond={respond}
        onSwitch={async () => {
          await actions.changeNetwork(switchTo);
          actions.clearSwitchingNetwork();
        }}
      />
    );
  }

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

/**
 * `ConfirmSheet` calls `onClose` after `onConfirm` as well, so each sheet
 * remembers whether the user chose, and only a close without a choice declines.
 */
function useChoice() {
  const chose = useRef(false);
  return {
    choose: () => {
      chose.current = true;
    },
    closedWithoutChoice: () => !chose.current,
  };
}

function NoWalletSheet({
  respond,
  onLeave,
}: {
  respond: (response: MWAResponse) => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const { choose, closedWithoutChoice } = useChoice();
  return (
    <ConfirmSheet
      visible
      title={t('dapp.mwa_no_wallet_title')}
      message={t('dapp.mwa_no_wallet_message')}
      confirmText={t('dapp.mwa_no_wallet_open')}
      cancelText={t('actions.close', 'Close')}
      onConfirm={async () => {
        choose();
        await Linking.openURL(SALMON_URL).catch((error: unknown) =>
          console.warn('[mwa] could not open Salmon', error)
        );
        respond(declined);
        onLeave();
      }}
      onClose={() => {
        if (closedWithoutChoice()) respond(declined);
      }}
    />
  );
}

function NetworkSwitchSheet({
  request,
  from,
  to,
  respond,
  onSwitch,
}: {
  request: MWARequest;
  from: string;
  to: string;
  respond: (response: MWAResponse) => void;
  onSwitch: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { choose, closedWithoutChoice } = useChoice();
  const origin = mwaIdentityOrigin(request.appIdentity?.identityUri) ?? '';
  const target = t(`dapp.mwa_network_names.${to}`);
  return (
    <ConfirmSheet
      visible
      title={t('dapp.mwa_switch_title')}
      message={t('dapp.mwa_switch_message', {
        origin: mwaDisplayName(request.appIdentity?.identityName, origin),
        target,
        current: t(`dapp.mwa_network_names.${from}`),
      })}
      confirmText={t('dapp.mwa_switch_confirm', { target })}
      onConfirm={async () => {
        // A failed switch is no choice: the close that follows declines.
        await onSwitch().then(choose, (error: unknown) =>
          console.warn('[mwa] network switch failed', error)
        );
      }}
      onClose={() => {
        if (closedWithoutChoice()) respond(declined);
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
