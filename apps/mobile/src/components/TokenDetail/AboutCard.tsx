/**
 * AboutCard — the "About" `Card`: description, contract address copy row,
 * website link.
 *
 * Lifted out of `token/[id].tsx` (spec 019 D3) so Home's Bitcoin column can
 * render the same card instead of the legacy `BlurContainer`-based
 * `TokenAbout`. Copy feedback is self-contained (`useCopyFeedback`) so every
 * consumer gets the tick animation for free.
 */
import React, { useCallback } from 'react';
import { Animated, Linking, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { fontFamilyNative, fontSize, lineHeight, s, spacing, vs, type Semantic } from '@salmon/shared';

import {
  ArrowSquareOutIcon,
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  iconSize,
} from '../../icons';
import { Card } from '../Card';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { SkeletonRow } from '../Skeleton';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { useThemedStyles, useSemantic } from '../../theme/useThemedStyles';

export interface AboutCardProps {
  description?: string;
  /** Omit when the asset has no on-chain contract address to show (e.g. Bitcoin). */
  contractAddress?: string;
  contractAddressShort?: string;
  website?: string;
  loading?: boolean;
  testID?: string;
}

export function AboutCard({
  description,
  contractAddress,
  contractAddressShort,
  website,
  loading = false,
  testID = 'token-detail-about',
}: AboutCardProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text, status } = useSemantic();
  const { copied, scale: tickScale, trigger: showCopied } = useCopyFeedback();

  const handleCopyAddress = useCallback(async () => {
    if (!contractAddress) return;
    await Clipboard.setStringAsync(contractAddress);
    showCopied();
  }, [contractAddress, showCopied]);

  const handleOpenWebsite = useCallback(async () => {
    if (!website) return;
    const supported = await Linking.canOpenURL(website);
    if (supported) await Linking.openURL(website);
  }, [website]);

  if (loading) {
    return <SkeletonRow testID={testID} lines={2} count={2} accessibilityLabel={t('token.info.about', 'About')} />;
  }

  if (!description && !contractAddress && !website) return null;

  return (
    <Card padding="lg" gap={spacing.md} testID={testID}>
      {description && (
        <View style={styles.aboutText}>
          <Text style={styles.cardTitle}>{t('token.info.about', 'About')}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      )}

      {contractAddress && (
        <ListRow
          testID="token-detail-contract-address"
          onPress={handleCopyAddress}
          accessibilityLabel={
            copied
              ? t('actions.copied')
              : t('accessibility.copy_contract_address', 'Copy contract address')
          }
          leading={<IconBubble size={36} tone="surface" icon={CopyIcon} iconSize={iconSize.sm} />}
          title={t('token.info.contractAddress', 'Contract Address')}
          subtitle={contractAddressShort}
          trailing={
            copied ? (
              <Animated.View style={{ transform: [{ scale: tickScale }] }}>
                <CheckIcon size={iconSize.sm} color={status.success} />
              </Animated.View>
            ) : undefined
          }
        />
      )}

      {website && (
        <ListRow
          testID="token-detail-website"
          onPress={handleOpenWebsite}
          accessibilityLabel={t('accessibility.open_website', 'Open website: {{url}}', {
            url: website,
          })}
          leading={<IconBubble size={36} tone="surface" icon={GlobeIcon} iconSize={iconSize.sm} />}
          title={t('token.info.visitWebsite', 'Visit Website')}
          trailing={<ArrowSquareOutIcon size={iconSize.sm} color={text.secondary} />}
        />
      )}
    </Card>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    cardTitle: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.bodyLg),
      lineHeight: s(fontSize.bodyLg) * lineHeight.snug,
      color: t.text.primary,
    },
    aboutText: {
      gap: vs(spacing.sm),
    },
    description: {
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.relaxed,
      color: t.text.secondary,
    },
  });
