/**
 * Auth Layout - Stack navigator for onboarding/authentication flow
 *
 * Screens in order:
 * 1. index (welcome) - Initial screen with create/recover options
 * 2. recover - Recover wallet with seed phrase
 * 3. create - Create new wallet (shows seed phrase)
 * 4. password - Set password for wallet encryption
 * 5. biometric-setup - Optional biometric unlock setup prompt
 * 6. success - Success confirmation after wallet creation
 * 7. derived-accounts - Select derived accounts to import
 */

import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { DepthBackground } from '../../src/components/DepthBackground';
import { ScalesBackground } from '../../src/components/ScalesBackground';

export default function AuthLayout() {
  return (
    <View style={styles.container}>
      {/*
        The same water the rest of the app stands in, mounted once for the
        whole flow rather than screen by screen — the diagonal onboarding
        gradient this replaces was a ground only onboarding had, which is
        exactly the seam the column exists to remove. One static Svg for every
        screen in the stack, not one per screen.

        `create` and `recover` opt out by painting themselves opaque in
        `surface.bedrock`: they carry the recovery phrase, and the Bedrock Rule
        allows no motif behind a seed. Every other screen here — welcome,
        password, biometric, consent, success, derived accounts — is content on
        an opaque surface over an open column.
      */}
      <DepthBackground />
      <ScalesBackground variant="deepField" />
      <Stack
        screenOptions={{
          // Hide headers - we handle our own back buttons
          headerShown: false,
          // Use default iOS-style animations
          animation: 'slide_from_right',
          // Prevent gesture back on certain screens (handled per-screen)
          gestureEnabled: true,
          // Transparent background to show gradient
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        {/* Welcome screen - entry point */}
        <Stack.Screen
          name="index"
          options={{
            // Can't go back from welcome
            gestureEnabled: false,
          }}
        />

        {/*
          `recover` and `create` inherit `gestureEnabled: true`. That is
          correct: backing out of either returns to the welcome screen with no
          key material written yet, and both screens already run their own
          in-screen back button through the same path.
        */}

        {/* Recover wallet with seed phrase */}
        <Stack.Screen name="recover" />

        {/* Create new wallet */}
        <Stack.Screen name="create" />

        {/* Set password */}
        <Stack.Screen
          name="password"
          options={{
            // Deliberate, and load-bearing: `create` calls `generateMnemonic()`
            // fresh every time its start button is pressed. Swiping back here
            // and forward again would hand the user a second seed phrase while
            // the first one is already stashed for the vault write — a wallet
            // whose recovery phrase was never shown. Do not enable.
            gestureEnabled: false,
          }}
        />

        {/*
          Everything below runs *after* the vault has been written. Going back
          would land the user on password entry for a wallet that already
          exists, so the gesture stays off on all four.
        */}

        {/* Biometric setup prompt */}
        <Stack.Screen
          name="biometric-setup"
          options={{
            gestureEnabled: false,
          }}
        />

        {/* First-run anonymous-analytics consent (final onboarding step) */}
        <Stack.Screen
          name="analytics-consent"
          options={{
            gestureEnabled: false,
          }}
        />

        {/* Success confirmation */}
        <Stack.Screen
          name="success"
          options={{
            gestureEnabled: false,
          }}
        />

        {/* Derived accounts selection */}
        <Stack.Screen
          name="derived-accounts"
          options={{
            gestureEnabled: false,
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
