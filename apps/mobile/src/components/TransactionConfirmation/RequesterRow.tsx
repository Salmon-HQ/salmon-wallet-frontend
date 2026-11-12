/**
 * RequesterRow — who asks: the requester's icon (or the globe), its name, and
 * the domain the user can check. A Solana Pay merchant on the review and on
 * its sheet (spec 043). The DOM twin is
 * `packages/ui/src/components/TransactionConfirmation/RequesterRow.tsx`.
 *
 * The icon is the merchant's, so it is drawn only over https and only as an
 * image (`expo-image`, never parsed as a document); the globe takes its place
 * the moment it fails.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  requesterIconSource,
  s,
  type Semantic,
} from '@salmon/shared';

import { GlobeIcon } from '../../icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import type { RequesterRowProps } from './types';

export function RequesterRow({ name, icon, domain, testID }: RequesterRowProps) {
  const styles = useThemedStyles(stylesFor);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [icon]);
  const uri = failed ? null : requesterIconSource(icon);

  const leading = uri ? (
    <IconBubble size={40} tone="surface">
      <Image
        source={{ uri }}
        style={styles.icon}
        contentFit="cover"
        onError={() => setFailed(true)}
        testID="requester-icon"
      />
    </IconBubble>
  ) : (
    <IconBubble size={40} tone="surface" icon={GlobeIcon} />
  );

  return (
    <ListRow
      leading={leading}
      title={name || domain}
      // A node, so the domain wraps: losing its tail is the one thing this
      // line must never do.
      subtitle={
        <Text style={styles.domain} testID="requester-domain">
          {domain}
        </Text>
      }
      accessibilityLabel={name ? `${name}, ${domain}` : domain}
      tone="shelf"
      padding="md"
      testID={testID}
    />
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    icon: { width: '100%', height: '100%' },
    domain: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      color: t.text.secondary,
    },
  });
