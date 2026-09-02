// Note: Crypto polyfills are now loaded in index.js (the app entry point)
// This ensures they're available BEFORE expo-router loads any modules

import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { createSemantic, type ThemeMode } from '@salmon/shared';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, AppState, useColorScheme, type AppStateStatus } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider } from '../src/i18n';
import { WalletInitErrorScreen } from '../src/components/WalletInitErrorScreen';
import { DEBUG_FORCE_WAIT, DEBUG_FORCE_WAIT_PROPS } from '../src/debug/forceWait';
import { PendingActivityBanner } from '../src/components/PendingActivityBanner';
import { useSemantic } from '../src/theme/useThemedStyles';
import {
  AccountsProvider,
  CurrencyProvider,
  useAccountsContext,
  useInactivityTimeout,
  createQueryClient,
  QueryClientProvider,
  PendingTransactionsProvider,
  usePendingActivity,
  ThemeProvider,
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
  const [queryClient] = useState(() => createQueryClient());
  // The OS reader lives here: `packages/shared` stays runtime-agnostic, so the
  // platform's colour scheme is passed in rather than looked up inside the
  // provider. Under the 'system' preference this is what picks the mode.
  // React Native reports a third value, 'unspecified', for a platform that
  // cannot tell; the provider's own "cannot tell" is `null`, which falls back
  // to deep water.
  const systemScheme = useColorScheme();
  const [loaded, error] = useFonts({
    DMSansRegular: require('@salmon/assets/src/fonts/DMSans-Regular.ttf'),
    DMSansMedium: require('@salmon/assets/src/fonts/DMSans-Medium.ttf'),
    DMSansSemiBold: require('@salmon/assets/src/fonts/DMSans-SemiBold.ttf'),
    DMSansBold: require('@salmon/assets/src/fonts/DMSans-Bold.ttf'),
    GeistMonoRegular: require('@salmon/assets/src/fonts/GeistMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PendingTransactionsProvider>
        <AccountsProvider>
          <CurrencyProvider>
            <ThemeProvider systemScheme={systemScheme === 'unspecified' ? null : systemScheme}>
              <RootLayoutNav />
            </ThemeProvider>
          </CurrencyProvider>
        </AccountsProvider>
      </PendingTransactionsProvider>
    </QueryClientProvider>
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

function RootLayoutNav() {
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

    // While the init-failed gate is up, don't redirect into the auth flow.
    if (initFailed) {
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
      // Accounts exist - but don't navigate to app if locked
      // The lock screen overlay will be shown first, and only after
      // successful unlock should we navigate to the app.
      // Also skip redirect when user is on post-creation auth screens
      // (password, success, derived-accounts) — they're still in the
      // creation flow and should finish before being sent to the app.
      const authScreen = segments.slice(1, 2)[0];
      const isPostCreationScreen =
        inAuthGroup &&
        typeof authScreen === 'string' &&
        [
          'password',
          'biometric-setup',
          'analytics-consent',
          'success',
          'derived-accounts',
        ].includes(authScreen);

      if (!inAppGroup && !hasNavigated && !state.locked && !isPostCreationScreen) {
        // Only auto-navigate to app on initial load when not locked
        router.replace('/(app)/(tabs)');
        setHasNavigated(true);
      }
    }
  }, [
    state.ready,
    state.locked,
    state.accounts.length,
    segments,
    navigationState?.key,
    hasNavigated,
    initFailed,
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
