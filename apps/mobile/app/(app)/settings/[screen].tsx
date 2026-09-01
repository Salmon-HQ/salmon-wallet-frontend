/**
 * One route for every settings sub-screen.
 *
 * The `SettingsScreen` union is still the navigation vocabulary — it is the
 * route's own parameter now, so `/settings/security` and `/settings/backup`
 * are real stack entries with the platform's back gesture, instead of panels
 * pushed onto a stack the gate owned.
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
  const params = useLocalSearchParams<Record<string, string>>();
  const registry = useSettingsPanelRegistry();

  const screen = params.screen as SettingsScreen | undefined;

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);

  const onNavigate = useCallback(
    (next: SettingsScreen, props?: Record<string, string>) => {
      router.push({ pathname: '/settings/[screen]', params: { screen: next, ...(props ?? {}) } });
    },
    [router]
  );

  // An unknown or missing key used to render an empty view, which is a blank
  // screen with no way out. Settings is the only sane destination.
  const render = screen ? registry[screen] : undefined;
  if (!render) return <Redirect href="/settings" />;

  const { screen: _screen, ...panelProps } = params;

  return (
    <View style={styles.container} testID={`settings-panel-${screen}`}>
      {render({ onBack, onNavigate, ...panelProps })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
