/**
 * TransferReceipt — CORE 07's composition: a seal, a sentence, a receipt
 * card of rows, two actions. What `send/success.tsx` first drew and
 * `nft/[id]/success.tsx` now shares via `ReceiptScreen tone="transfer"`.
 */
import React, { useEffect } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import {
  fontFamilyNative,
  fontSize,
  letterSpacing,
  lineHeight,
  s,
  semantic,
  spacing,
  vs,
} from '@salmon/shared';

import { CheckIcon } from '../../icons';
import { Card } from '../Card';
import { PrimaryButton, SecondaryButton } from '../Button';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { useTabChrome } from '../../../hooks/useTabChrome';
import type { TransferReceiptScreenProps } from './types';

/** The seal: the ink well the frames draw, with the tick at its icon step. */
const SEAL_SIZE = 88;
const SEAL_ICON_SIZE = 48;

export function TransferReceipt({
  title,
  body,
  rows,
  primary,
  secondary,
  explorerUrl,
  settling = false,
  testID = 'tx-success-screen',
}: Omit<TransferReceiptScreenProps, 'tone'>) {
  const { t } = useTranslation();
  const { floatingBottomOffset } = useTabChrome();

  // The haptic is the whole of the arrival: the receipt is simply there,
  // complete, the frame it mounts. When the flow is still settling, the
  // haptic waits for the moment it flips — a receipt for money that has not
  // actually landed is not an arrival yet.
  useEffect(() => {
    if (settling) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [settling]);

  return (
    <>
      <View style={styles.cluster} testID={testID}>
        <IconBubble
          size={SEAL_SIZE}
          tone="ink"
          icon={CheckIcon}
          iconSize={SEAL_ICON_SIZE}
          iconWeight="bold"
          iconColor={semantic.status.success}
          testID="tx-success-seal"
        />
        <Text style={styles.title} testID="tx-success-title">
          {title}
        </Text>
        {body ? (
          <Text style={styles.body} testID="tx-success-summary">
            {body}
          </Text>
        ) : null}

        <Card padding="lg" gap={spacing.md} style={styles.receipt} testID="tx-success-receipt">
          {rows.map((row, index) => (
            <KeyValueRow key={row.testID ?? `${row.label}-${index}`} {...row} />
          ))}
        </Card>
      </View>

      <View style={[styles.action, { paddingBottom: floatingBottomOffset }]}>
        {explorerUrl && !settling ? (
          <SecondaryButton
            testID="tx-success-explorer-link"
            onPress={() => Linking.openURL(explorerUrl)}
          >
            {t('transaction.viewOnExplorer')}
          </SecondaryButton>
        ) : null}
        {!explorerUrl && secondary ? (
          <SecondaryButton testID={secondary.testID} onPress={secondary.onPress}>
            {secondary.label}
          </SecondaryButton>
        ) : null}
        <PrimaryButton testID={primary.testID} onPress={primary.onPress} disabled={settling}>
          {primary.label}
        </PrimaryButton>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // The report sits in the middle of the water; the actions keep the bottom
  // edge.
  cluster: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(spacing.screenGutter),
    gap: vs(spacing.screenGutter),
  },
  title: {
    fontSize: s(fontSize.display),
    lineHeight: s(fontSize.display) * lineHeight.snug,
    fontFamily: fontFamilyNative.bold,
    letterSpacing: letterSpacing.snug,
    color: semantic.text.primary,
    textAlign: 'center',
  },
  body: {
    fontSize: s(fontSize.body),
    lineHeight: s(fontSize.body) * lineHeight.normal,
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
    textAlign: 'center',
  },
  receipt: {
    alignSelf: 'stretch',
  },
  action: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingTop: vs(spacing.md),
    gap: vs(spacing.md),
  },
});
