import { Stack } from 'expo-router';

export default function AppLayout() {
  // Headers stay hidden app-wide: the wallet chrome is the `WalletHeader` row
  // the tabs layout renders, and every pushed screen draws the kit's own
  // `ScreenHeader`. A native header would double up on both.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="wallets" />
      {/* Powerups browse is a full-height presentation, not a card: the owner
          wants it to cover the Home header entirely, and a card modal leaves
          the parent peeking above it. `fullScreenModal` gives iOS the
          bottom-up cover; `slide_from_bottom` + a vertical gesture give
          Android and the swipe-down dismissal the same direction. */}
      <Stack.Screen
        name="powerups"
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          gestureDirection: 'vertical',
        }}
      />
    </Stack>
  );
}
