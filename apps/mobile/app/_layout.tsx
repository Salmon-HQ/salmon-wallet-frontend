// Note: Crypto polyfills are now loaded in index.js (the app entry point)
// This ensures they're available BEFORE expo-router loads any modules

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { colors } from '@salmon/shared';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, AppState, type AppStateStatus } from 'react-native';
import 'react-native-reanimated';

import { I18nProvider } from '../src/i18n';
import { WalletInitErrorScreen } from '../src/components/WalletInitErrorScreen';
import {
  AccountsProvider,
  CurrencyProvider,
  useAccountsContext,
  useInactivityTimeout,
  createQueryClient,
  QueryClientProvider,
  BridgeSettlementProvider,
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
  const [loaded, error] = useFonts({
    GeistRegular: require('@salmon/assets/src/fonts/Geist-Regular.ttf'),
    GeistMedium: require('@salmon/assets/src/fonts/Geist-Medium.ttf'),
    GeistSemiBold: require('@salmon/assets/src/fonts/Geist-SemiBold.ttf'),
    GeistBold: require('@salmon/assets/src/fonts/Geist-Bold.ttf'),
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
      <BridgeSettlementProvider>
        <AccountsProvider>
          <CurrencyProvider>
            <RootLayoutNav />
          </CurrencyProvider>
        </AccountsProvider>
      </BridgeSettlementProvider>
    </QueryClientProvider>
  );
}

// Custom dark theme with app background color matching header
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent', // Transparent to let layout backgrounds show through
    card: colors.background.primary,
  },
};

function RootLayoutNav() {
  // Always use dark theme for the wallet app
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
        <ThemeProvider value={CustomDarkTheme}>
          <View style={styles.container}>
            <WalletInitErrorScreen onRetry={actions.retryInit} />
          </View>
        </ThemeProvider>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <ThemeProvider value={CustomDarkTheme}>
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
        </View>
      </ThemeProvider>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
