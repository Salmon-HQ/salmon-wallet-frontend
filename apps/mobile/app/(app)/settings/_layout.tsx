import { Stack } from 'expo-router';

// Settings is a stack of real screens: the list, then one sub-screen per
// `SettingsScreen` key. Headers stay hidden because each screen draws the kit's
// own `ScreenHeader` — a native header would stack a second title on top.
//
// The same right-slide the app stack uses: a settings sub-screen is a pushed
// screen like any other, and it must not arrive from a different edge than
// Wallets or Activity do.
export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureDirection: 'horizontal',
      }}
    />
  );
}
