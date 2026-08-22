import { Stack } from 'expo-router';

export default function AppLayout() {
  // Headers stay hidden app-wide: the wallet chrome is the GateContainer header
  // rendered by the tabs layout, which morphs between collapsed / settings /
  // wallets states and carries the avatar, address and actions. A native header
  // cannot express that, and showing one would double up.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
