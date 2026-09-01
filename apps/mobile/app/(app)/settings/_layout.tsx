import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';

import { DepthBackground, ScalesBackground } from '../../../src/components';

/**
 * Settings is a screen of the `(app)` stack, not a tab.
 *
 * It used to live at `(app)/(tabs)/settings` with `href: null`. A tab is not
 * pushed on the `(app)` stack, so the stack's `slide_from_right` never ran for
 * it — the gear cut to Settings while Wallets, Activity and Send all slid.
 * Registered on the `(app)` stack, this sub-stack inherits that push like the
 * send flow does.
 *
 * `initialRouteName` is what makes a cold `/settings/<key>` work: the entry is
 * built on top of the list, so `router.canGoBack()` is true and back lands on
 * Settings instead of nowhere. Every panel resolves its data from hooks
 * (`useSettingsPanelRegistry`), never from state the list captured, so the
 * sub-screen renders the same whether the list was mounted first or not.
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function SettingsLayout() {
  return (
    <View style={styles.container}>
      {/* The water. It used to come from the tabs layout, which no longer sits
          under these screens. Painted once for the whole sub-stack, so a push
          slides the content over still water instead of over a second copy. */}
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureDirection: 'horizontal',
          // Transparent so the shared water above shows through; an opaque
          // card would paint the theme background over it.
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="[screen]" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
