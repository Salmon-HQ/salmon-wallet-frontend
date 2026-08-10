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
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@salmon/shared';

export default function AuthLayout() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.onboarding.colors}
        start={gradients.onboarding.start}
        end={gradients.onboarding.end}
        style={StyleSheet.absoluteFill}
      />
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

      {/* Recover wallet with seed phrase */}
      <Stack.Screen name="recover" />

      {/* Create new wallet */}
      <Stack.Screen name="create" />

      {/* Set password */}
      <Stack.Screen
        name="password"
        options={{
          // Don't allow back gesture during password setup
          // to prevent accidentally losing progress
          gestureEnabled: false,
        }}
      />

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
          // Can't go back from success
          gestureEnabled: false,
        }}
      />

      {/* Derived accounts selection */}
      <Stack.Screen
        name="derived-accounts"
        options={{
          // Can't go back from derived accounts
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
