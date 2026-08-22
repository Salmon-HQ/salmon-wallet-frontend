import { Stack } from 'expo-router';

// The real settings UI renders as a sheet from the tabs layout Gate, so this
// stack only ever hosts the placeholder route. Its header stays hidden to match
// every other stack in the app — a native header here would stack on top of the
// Gate's own header if the route were ever reached directly.
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
