import React from 'react';
import { Stack } from 'expo-router';

/**
 * Settings is a screen of the `(app)` stack, not a tab.
 *
 * It used to live at `(app)/(tabs)/settings` with `href: null`. A tab is not
 * pushed on the `(app)` stack, so the stack's `slide_from_right` never ran for
 * it — the gear cut to Settings while Wallets, Activity and Send all slid.
 * Registered on the `(app)` stack, this sub-stack inherits that push like the
 * send flow does.
 *
 * Every screen in it paints its own water (`SettingsScreenLayout` mounts the
 * same two layers every pushed screen does), and the cards stay opaque. The
 * water used to be painted once here with transparent cards on top, which
 * let the outgoing list show through the incoming panel for the length of
 * the slide — a ghost of the list behind every sub-screen as it arrived.
 *
 * No `initialRouteName` anchor: with one set, a push toward the navigator can
 * stack a fresh instance showing the anchor — tapping a row reopened the list
 * instead of the panel. A cold `/settings/<key>` still gets out: the panel's
 * own back falls back to `router.replace('/settings')` when there is nothing
 * to pop. Every panel resolves its data from hooks
 * (`useSettingsPanelRegistry`), never from state the list captured, so the
 * sub-screen renders the same whether the list was mounted first or not.
 */
export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[panel]" />
    </Stack>
  );
}
