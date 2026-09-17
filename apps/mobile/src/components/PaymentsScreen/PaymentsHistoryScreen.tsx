/**
 * PaymentsHistoryScreen — every request this account made on this device,
 * newest first, pushed over Home from the tab's clock (owner, 2026-09-16).
 * The same rows and the same sheet as the tab; only the scope differs.
 * DOM twin: `PaymentsPage/PaymentsHistoryPage`.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { componentSizes, s, spacing, vs } from '@salmon/shared';
import { usePaymentsScreenLogic } from '@salmon/shared/powerups';

import { DepthBackground } from '../DepthBackground';
import { ScalesBackground } from '../ScalesBackground';
import { ScreenHeader } from '../ScreenHeader';
import { StateBlock } from '../StateBlock';
import { PaymentRequestList } from './PaymentRequestList';
import type { PaymentsHistoryScreenProps } from './types';

export function PaymentsHistoryScreen({
  publicKey,
  networkId,
  onBack,
  style,
  testID = 'payments-history-screen',
}: PaymentsHistoryScreenProps) {
  const { t } = useTranslation();
  const { list, sheet, unavailable } = usePaymentsScreenLogic({
    publicKey,
    networkId,
    scope: 'all',
  });
  const { nested: _nested, ...request } = sheet;

  return (
    <SafeAreaView style={[styles.container, style]} edges={['top', 'bottom']} testID={testID}>
      {/* Pushed over the tab shell, so it does not inherit the shell's water —
          it mounts the same two layers, exactly as Activity does. */}
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader
        onBack={onBack}
        title={t('payments.history.title')}
        subtitle={t('payments.history.subtitle')}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {unavailable ? (
          <StateBlock tone="error" testID="payments-unavailable" title={unavailable} />
        ) : (
          <PaymentRequestList rows={list.rows} empty={list.empty} sheet={request} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: s(spacing.screenGutter),
  },
  content: {
    paddingBottom: vs(componentSizes.tabBarScrollPadding),
  },
});
