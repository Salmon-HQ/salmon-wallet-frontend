/**
 * One route for every settings sub-screen.
 *
 * The `SettingsScreen` union is still the navigation vocabulary — it is the
 * route's own parameter now, so `/settings/security` and `/settings/backup`
 * are real stack entries with the platform's back gesture, instead of panels
 * pushed onto a stack the gate owned.
 *
 * The segment is `[panel]`, not `[screen]`: `screen` is the key React
 * Navigation and expo-router use to address a nested navigator's child, and
 * expo-router strips it from the params while building the push action
 * (`global-state/routing.js`, `getPayloadFromStateRoute`). A `[screen]`
 * segment therefore mounts with empty params — every row bounced back to the
 * list. `__tests__/app/settings-route-param.test.tsx` pins this.
 *
 * Every panel body pulls its own data through `useSettingsPanelRegistry`
 * (accounts, address book, networks, currency), so this route renders the same
 * whether the user walked in from the Settings list or landed here cold from a
 * deep link or from Wallets' rename/add.
 *
 * The bodies are the existing panels, unchanged: each one already draws its
 * title and back through `SettingsScreenLayout`.
 */
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { SettingsScreen } from '@salmon/shared';

import { useSettingsPanelRegistry } from '../../../src/settings/panelRegistry';

export default function SettingsPanelRoute() {
  const router = useRouter();
  const { panel, ...panelProps } = useLocalSearchParams<Record<string, string>>();
  const registry = useSettingsPanelRegistry();

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);

  const onNavigate = useCallback(
    (next: SettingsScreen, props?: Record<string, string>) => {
      router.push({ pathname: '/settings/[panel]', params: { panel: next, ...(props ?? {}) } });
    },
    [router]
  );

  // An unknown or missing key used to render an empty view, which is a blank
  // screen with no way out. Settings is the only sane destination.
  const render = panel ? registry[panel as SettingsScreen] : undefined;
  if (!render) {
    return <Redirect href="/settings" />;
  }

  return (
    <View style={styles.container} testID={`settings-panel-${panel}`}>
      {render({ onBack, onNavigate, ...panelProps })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
