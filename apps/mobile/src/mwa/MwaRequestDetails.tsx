/**
 * What an MWA approval sheet says about the request, as kit cards — the
 * mobile reading of the extension's approval cards
 * (`packages/ui/src/components/DAppApproval`): who is asking, from which
 * wallet, and what is signed, each in its own container, never a joined
 * string. `ConfirmSheet` draws it above the message that says what approving
 * does.
 *
 * The warning and the origin are what Salmon can vouch for; the name is the
 * dApp's own claim. Digital Asset Links vouch only for native apps, so an
 * unverified request opens on the warning and names its origin as a claim.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamilyNative, fontSize, lineHeight, s, spacing, type Semantic } from '@salmon/shared';

import { Card } from '../components/Card';
import { IconBubble } from '../components/IconBubble';
import { KeyValueRow } from '../components/KeyValueRow';
import { ListRow } from '../components/ListRow';
import { SectionLabel } from '../components/SectionLabel';
import { WarningNotice } from '../components/WarningNotice';
import { GlobeIcon, PenNibIcon, WalletIcon, iconSize, type IconComponent } from '../icons';
import { useSemantic, useThemedStyles } from '../theme/useThemedStyles';

/** The extension's `AppIdentity` bubble size. */
const SITE_BUBBLE_SIZE = 40;

export interface MwaRequestDetailsProps {
  /** The normalised origin, the one the identity check was given. */
  origin: string;
  /** The name the dApp gives itself (or its origin when it gave none). */
  name: string;
  /** The identity check said no: the origin is a claim. */
  unverified: boolean;
  /** The account that signs or connects. */
  account?: { name?: string; address: string };
  /** The message to sign, verbatim. */
  message?: string;
}

function CardHead({ icon: Icon, label }: { icon: IconComponent; label: string }) {
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();
  return (
    <View style={styles.head}>
      <Icon size={iconSize.sm} color={text.secondary} />
      <SectionLabel variant="group">{label}</SectionLabel>
    </View>
  );
}

export function MwaRequestDetails({
  origin,
  name,
  unverified,
  account,
  message,
}: MwaRequestDetailsProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const originLine = unverified ? t('dapp.mwa_unverified_origin', { origin }) : origin;

  return (
    <>
      {unverified ? (
        <WarningNotice
          tone="warning"
          testID="mwa-unverified"
          title={t('dapp.mwa_unverified', { origin })}
        />
      ) : null}

      <Card padding="lg" gap={spacing.md} testID="mwa-site">
        <CardHead icon={GlobeIcon} label={t('dapp.requesting_site')} />
        <ListRow
          leading={<IconBubble size={SITE_BUBBLE_SIZE} tone="surface" icon={GlobeIcon} />}
          title={name}
          // A node, so the origin wraps: losing its tail is the one thing
          // this line must never do.
          subtitle={
            <Text style={styles.origin} testID="mwa-site-origin">
              {originLine}
            </Text>
          }
          accessibilityLabel={`${name}, ${originLine}`}
          tone="shelf"
          padding="md"
        />
      </Card>

      {account ? (
        <Card padding="lg" gap={spacing.md} testID="mwa-wallet">
          <CardHead icon={WalletIcon} label={t('dapp.wallet_address')} />
          <KeyValueRow
            layout="stacked"
            label={account.name || t('dapp.current_wallet')}
            value={account.address}
            valueFont="mono"
          />
        </Card>
      ) : null}

      {message != null ? (
        <Card padding="lg" gap={spacing.md} testID="mwa-message">
          <CardHead icon={PenNibIcon} label={t('dapp.message')} />
          <Card tone="shelf" padding="sm" radius="lg">
            <Text style={styles.mono} testID="mwa-message-text">
              {message}
            </Text>
          </Card>
        </Card>
      ) : null}
    </>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
    },
    origin: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      color: t.text.secondary,
    },
    // Verbatim signing content — the scanning face, wrapped, never clipped.
    mono: {
      fontFamily: fontFamilyNative.mono,
      fontSize: s(fontSize.mono),
      lineHeight: s(fontSize.mono) * lineHeight.relaxed,
      color: t.text.primary,
    },
  });
