/**
 * TransferReceipt — CORE 07's composition, on the DOM: a seal, a sentence, a
 * receipt card of rows, two actions.
 *
 * The mobile twin is `apps/mobile/src/components/ReceiptScreen/TransferReceipt.tsx`;
 * the anatomy, spacing and typography are the same, read from the same
 * `TransferReceiptScreenPropsBase` contract. DOM alternatives: `Linking.openURL`
 * becomes `window.open(url, '_blank', 'noopener,noreferrer')`; mobile's
 * `useTabChrome().floatingBottomOffset` (the floating tab bar's reserved
 * height) has no DOM equivalent — the web app has no floating tab bar, so the
 * action band closes on a fixed token instead. The success haptic
 * (`expo-haptics`) has no DOM equivalent and is dropped — brief hard rule 4,
 * "No haptics."
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  spacing,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckIcon } from '../../icons';
import { Card } from '../Card';
import { PrimaryButton, SecondaryButton } from '../Button';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
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
  const { t: translate } = useTranslation();
  const t = useSemantic();

  const cluster: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.screenGutter,
    paddingRight: spacing.screenGutter,
    gap: spacing.screenGutter,
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.display,
    lineHeight: `${fontSize.display * lineHeight.snug}px`,
    letterSpacing: letterSpacing.snug,
    color: t.text.primary,
    textAlign: 'center',
    margin: 0,
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.body,
    lineHeight: `${fontSize.body * lineHeight.normal}px`,
    color: t.text.secondary,
    textAlign: 'center',
    margin: 0,
  };

  const action: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: spacing.screenGutter,
    paddingRight: spacing.screenGutter,
    paddingTop: spacing.md,
    // No DOM equivalent for `useTabChrome().floatingBottomOffset` — the web
    // app has no floating tab bar to clear, so the band closes on the grid's
    // own bottom air instead.
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  };

  return (
    <>
      <div style={cluster} data-testid={testID}>
        <IconBubble
          size={SEAL_SIZE}
          tone="ink"
          icon={CheckIcon}
          iconSize={SEAL_ICON_SIZE}
          iconWeight="bold"
          iconColor={t.status.success}
          testID="tx-success-seal"
        />
        <p style={titleStyle} data-testid="tx-success-title">
          {title}
        </p>
        {body ? (
          <p style={bodyStyle} data-testid="tx-success-summary">
            {body}
          </p>
        ) : null}

        <Card
          padding="lg"
          gap={spacing.md}
          style={{ alignSelf: 'stretch' }}
          testID="tx-success-receipt"
        >
          {rows.map((row, index) => (
            <KeyValueRow key={row.testID ?? `${row.label}-${index}`} {...row} />
          ))}
        </Card>
      </div>

      <div style={action}>
        {explorerUrl && !settling ? (
          <SecondaryButton
            testID="tx-success-explorer-link"
            onPress={() => window.open(explorerUrl, '_blank', 'noopener,noreferrer')}
          >
            {translate('transaction.viewOnExplorer')}
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
      </div>
    </>
  );
}
