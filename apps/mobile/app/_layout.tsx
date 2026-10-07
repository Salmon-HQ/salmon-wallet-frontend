// Note: Crypto polyfills are now loaded in index.js (the app entry point)
// This ensures they're available BEFORE expo-router loads any modules

import { createSemantic, type ThemeMode } from '@salmon/shared';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
  router,
  useSegments,
  useRootNavigationState,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  AppState,
  Linking,
  Platform,
  type AppStateStatus,
} from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider } from '../src/i18n';

import { AppProviders, useAppFonts } from '../src/providers/AppProviders';
import { useMandatoryUpdate } from '../src/updates/useMandatoryUpdate';
import { STORE_URLS, useStoreUpdateGate } from '../src/updates/useStoreUpdateGate';
import { WalletInitErrorScreen } from '../src/components/WalletInitErrorScreen';
import { UpdateRequiredScreen } from '../src/components/UpdateRequiredScreen';
import { DEBUG_FORCE_WAIT, DEBUG_FORCE_WAIT_PROPS } from '../src/debug/forceWait';
import { PendingActivityBanner } from '../src/components/PendingActivityBanner';
import { useSemantic } from '../src/theme/useThemedStyles';
import {
  useAccountsContext,
  useInactivityTimeout,
  usePendingActivity,
  useTheme,
} from '@salmon/shared';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading keeps a back button present.
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const [loaded, error] = useAppFonts();

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // A pending update is applied before the app is shown, not on some later
  // launch the user may never make. Fails open and is time-bounded — see
  // `useMandatoryUpdate`.
  const checkingForUpdate = useMandatoryUpdate();
  // In parallel: is this build older than the minimum the team publishes for
  // the store? If so the navigator never mounts — see `useStoreUpdateGate`.
  const storeGate = useStoreUpdateGate();
  const ready = loaded && !checkingForUpdate && !storeGate.checking;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <AppProviders>
      <RootLayoutNav updateRequired={storeGate.required} />
    </AppProviders>
  );
}

/**
 * The navigator's own palette, derived from the mode.
 *
 * React Navigation keeps its theme in a plain object, so it cannot read the
 * token hook — it is handed a value instead, rebuilt whenever the mode
 * changes. Two of these colours are deliberately not the mapping the spec
 * table suggests, and both deviations are structural rather than chromatic:
 *
 * - `background` stays `'transparent'` in both modes. The ground is painted by
 *   the layouts (`DepthBackground`), and an opaque navigator background would
 *   sit in front of it.
 * - `card` is `depth.abyss`, the value the dark theme has shipped, rather than
 *   `surface.raised`. It is the plane behind a screen during a transition —
 *   the deepest ground, not a card — and in light it resolves to the light
 *   ramp's own deepest step.
 *
 * Everything else follows the tokens. Dark is byte-for-byte what
 * `CustomDarkTheme` was, plus the four colours it left at React Navigation's
 * defaults (`text`, `border`, `primary`, `notification`) — every screen sets
 * `headerShown: false`, so those four have no live consumer today and naming
 * them costs nothing but makes the light theme complete.
 */
function navigationTheme(mode: ThemeMode) {
  const t = createSemantic(mode);
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...base,
    dark: mode === 'dark',
    colors: {
      ...base.colors,
      background: 'transparent',
      card: t.depth.abyss,
      text: t.text.primary,
      border: t.border.default,
      primary: t.accent.ink,
      notification: t.accent.ink,
    },
  };
}

/** The store listing for this build's platform; the update gate's one exit. */
function openStore(): void {
  const url = STORE_URLS[Platform.OS === 'android' ? 'android' : 'ios'];
  Linking.openURL(url).catch((error) => {
    console.warn('[updates] could not open the store:', error);
  });
}

function RootLayoutNav({ updateRequired }: { updateRequired: boolean }) {
  const { mode } = useTheme();
  const navTheme = navigationTheme(mode);
  // The bar's glyphs are the inverse of the ground under them: light glyphs on
  // deep water, dark ones on the pale ground.
  const barStyle = mode === 'dark' ? 'light' : 'dark';
  const semantic = useSemantic();
  // `app.json`'s `backgroundColor` is a static dark hex, so it paints the
  // native window behind every screen transition — a light-mode transition
  // would flash the shipped dark ground without this following the mode.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(semantic.depth.column);
  }, [semantic]);
  const [state, actions] = useAccountsContext();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lockInFlightRef = useRef(false);

  // Inactivity timeout disabled on mobile — lock is handled by AppState (background).
  // The timeout only makes sense on web/extension where tabs stay open indefinitely.
  useInactivityTimeout({
    timeoutMs: 5 * 60 * 1000,
    onTimeout: () => {},
    enabled: false,
  });

  // Track if we've done the initial navigation
  const [hasNavigated, setHasNavigated] = useState(false);

  // Wallet initialization failed and nothing loaded — block instead of routing
  // into onboarding (which risks overwriting an existing vault). The lock
  // screen takes precedence (`!locked`), and a secondary failure with accounts
  // loaded must not block.
  const initFailed = state.ready && !state.locked && !!state.error && state.accounts.length === 0;

  useEffect(() => {
    // Don't navigate until the navigation state is ready and useAccounts is ready
    if (!navigationState?.key || !state.ready) {
      return;
    }

    // While a gate is up (update required, init failed), don't redirect into
    // the auth flow: the navigator is not mounted.
    if (updateRequired || initFailed) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    const hasAccounts = state.accounts.length > 0;

    // Determine where the user should be
    if (!hasAccounts) {
      // No accounts exist - go to auth flow
      if (!inAuthGroup) {
        router.replace('/(auth)');
        setHasNavigated(true);
      }
    } else {
      // Accounts exist — route into the app whether or not the wallet is
      // locked. `(app)/_layout` covers everything it can push with the lock
      // overlay while locked, so this is the lock screen, mounted.
      //
      // It used to wait for `!state.locked`, which never came on a cold start:
      // metadata populates `accounts` before the lock is raised, so a
      // returning user matched "has accounts, is locked" and the redirect
      // never fired. They were left on `(auth)/index` — the *onboarding
      // welcome screen*, offering to create a wallet — and reached their own
      // funds through a text link. No Face ID prompt, because the overlay
      // that raises it had not mounted. Half of "Face ID doesn't work".
      //
      // Skip the redirect only for the post-creation screens, which are still
      // finishing the creation flow.
      const authScreen = segments.slice(1, 2)[0];
      const isPostCreationScreen =
        inAuthGroup &&
        typeof authScreen === 'string' &&
        ['password', 'biometric-setup', 'analytics-consent', 'success'].includes(authScreen);

      if (!inAppGroup && !hasNavigated && !isPostCreationScreen) {
        router.replace('/(app)/(tabs)');
        setHasNavigated(true);
      }
    }
  }, [
    state.ready,
    state.accounts.length,
    segments,
    navigationState?.key,
    hasNavigated,
    initFailed,
    updateRequired,
  ]);

  // Determine if lock screen should be shown
  // Don't show lock screen during onboarding (auth flow) — the user just created
  // their account and is still in the setup process (biometric enrollment, success, etc.)
  useEffect(() => {
    if (!state.ready) {
      return;
    }

    const tryLock = (): void => {
      if (
        !state.requiredLock ||
        state.locked ||
        state.accounts.length === 0 ||
        lockInFlightRef.current
      ) {
        return;
      }

      lockInFlightRef.current = true;
      void actions.lockAccounts().finally(() => {
        lockInFlightRef.current = false;
      });
    };

    const changeSubscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      // Only lock when going to background, NOT inactive.
      // iOS sets state to 'inactive' for system overlays like Face ID prompts,
      // Control Center, notifications — locking on inactive causes a loop
      // when biometric auth is active.
      const goingToBackground =
        nextState === 'background' && (previousState === 'active' || previousState === 'inactive');

      if (!goingToBackground) {
        return;
      }

      tryLock();
    });

    return () => {
      changeSubscription.remove();
    };
  }, [actions, state.accounts.length, state.locked, state.ready, state.requiredLock]);

  // An unsupported build is not opened at all: this gate precedes the lock
  // screen and the init-failed gate, and the store is the only way out.
  if (updateRequired) {
    return (
      <I18nProvider>
        <NavigationThemeProvider value={navTheme}>
          <StatusBar style={barStyle} />
          <View style={styles.container}>
            <UpdateRequiredScreen onOpenStore={openStore} />
          </View>
        </NavigationThemeProvider>
      </I18nProvider>
    );
  }

  if (initFailed) {
    return (
      <I18nProvider>
        <NavigationThemeProvider value={navTheme}>
          <StatusBar style={barStyle} />
          <View style={styles.container}>
            <WalletInitErrorScreen onRetry={actions.retryInit} />
          </View>
        </NavigationThemeProvider>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <NavigationThemeProvider value={navTheme}>
        <StatusBar style={barStyle} />
        {/* One gesture root for the whole app: every GestureDetector (balance
            chain swipe, sheets) resolves to this instead of carrying its own. */}
        <GestureHandlerRootView style={styles.container}>
          <SafeAreaProvider>
            {/* Feeds the keyboard's position frame by frame, so what it lifts
                rides with it instead of jumping once it has opened. */}
            <KeyboardProvider>
              <View style={styles.container}>
                <Stack screenOptions={{ headerShown: false }}>
                  {/* Auth flow - onboarding screens */}
                  <Stack.Screen
                    name="(auth)"
                    options={{
                      // Prevent going back to auth after completing onboarding
                      gestureEnabled: false,
                    }}
                  />

                  {/* Main app - tabs and other screens */}
                  <Stack.Screen
                    name="(app)"
                    options={{
                      // Prevent going back
                      gestureEnabled: false,
                    }}
                  />
                </Stack>
                <PendingActivity />
                {/* Wait preview. Off by default; see src/debug/forceWait.ts. */}
                {DEBUG_FORCE_WAIT && <WaitPreview />}
              </View>
            </KeyboardProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </NavigationThemeProvider>
    </I18nProvider>
  );
}

/**
 * The wait preview, behind `DEBUG_FORCE_WAIT`. The loading screen is required
 * lazily rather than imported: a static import would pull the whole motion
 * layer — Reanimated easings, shared mutables — into every consumer of the
 * root layout, including tests that have no business knowing about it. With
 * the switch off this never executes.
 */
function WaitPreview() {
  const { LoadingScreen } = require('../src/components/LoadingScreen');
  return <LoadingScreen visible waves {...DEBUG_FORCE_WAIT_PROPS} />;
}

/**
 * Global in-flight surface, mounted as a sibling of the navigator so it
 * outlives every screen transition — including the lock that fires the moment
 * the app is backgrounded.
 */
function PendingActivity() {
  const { items, dismiss } = usePendingActivity();
  return <PendingActivityBanner items={items} onDismiss={dismiss} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
