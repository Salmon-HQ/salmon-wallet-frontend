import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  AccountsProvider,
  createQueryClient,
  CurrencyProvider,
  focusManager,
  PendingTransactionsProvider,
  QueryClientProvider,
  registerSeedVault,
  setApiPlatform,
  ThemeProvider,
} from '@salmon/shared';
import { useFonts } from 'expo-font';
import { useState, type ReactNode } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';

import { BiometricProvider } from '../contexts/BiometricContext';
import { deauthorizeSeed, SEED_VAULT_MAX_PER_REQUEST, seedVaultBridge } from '../seed-vault/bridge';

// Process-wide setup, here because both React roots (the app's navigator and
// the dApp approval activity) load this module before rendering anything.

// The backend's availability gate reads the platform on every request
// (spec 018); named once, before any screen asks for anything.
setApiPlatform(Platform.OS === 'ios' ? 'ios' : 'android');

// Seed Vault wallets (spec 037) sign through the device's Seed Vault, which
// only Android has; everywhere else they refuse to sign as unavailable.
if (Platform.OS === 'android') {
  registerSeedVault({
    bridge: seedVaultBridge,
    maxPerRequest: SEED_VAULT_MAX_PER_REQUEST,
    release: deauthorizeSeed,
  });
}

// React Query learns that the user came back from the DOM's focus events, which
// React Native does not have: without this, `refetchOnWindowFocus` never fires
// and reopening the app showed whatever was cached — an NFT already sent, a
// balance from before a receive. Coming to the foreground is the app's focus.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) =>
    handleFocus(state === 'active')
  );
  return () => subscription.remove();
});

/** The fonts every screen assumes; both React roots (app and dApp approval) load them. */
export function useAppFonts() {
  return useFonts({
    DMSansRegular: require('@salmon/assets/src/fonts/DMSans-Regular.ttf'),
    DMSansMedium: require('@salmon/assets/src/fonts/DMSans-Medium.ttf'),
    DMSansSemiBold: require('@salmon/assets/src/fonts/DMSans-SemiBold.ttf'),
    DMSansBold: require('@salmon/assets/src/fonts/DMSans-Bold.ttf'),
    GeistMonoRegular: require('@salmon/assets/src/fonts/GeistMono-Regular.ttf'),
    ...FontAwesome.font,
  });
}

/**
 * Wallet state shared by both React roots: the app's navigator and the
 * activity that answers dApps over Mobile Wallet Adapter.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  // The OS reader lives here: `packages/shared` stays runtime-agnostic, so the
  // platform's colour scheme is passed in rather than looked up inside the
  // provider. Under the 'system' preference this is what picks the mode.
  // React Native reports a third value, 'unspecified', for a platform that
  // cannot tell; the provider's own "cannot tell" is `null`, which falls back
  // to deep water.
  const systemScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <PendingTransactionsProvider>
        <AccountsProvider>
          <CurrencyProvider>
            <ThemeProvider systemScheme={systemScheme === 'unspecified' ? null : systemScheme}>
              {/* Above both route groups: onboarding arms biometrics, the app
                  shell unlocks with them, and Settings toggles them. Three
                  copies of that state is how the toggle and the lock screen
                  came to disagree. */}
              <BiometricProvider>{children}</BiometricProvider>
            </ThemeProvider>
          </CurrencyProvider>
        </AccountsProvider>
      </PendingTransactionsProvider>
    </QueryClientProvider>
  );
}
