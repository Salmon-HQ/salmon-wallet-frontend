/**
 * AboutPanel – App info panel.
 * Extracted from the route file for use in the SettingsPanelStack.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  ArrowSquareOutIcon,
  BookOpenIcon,
  FileIcon,
  FileTextIcon,
  GithubLogoIcon,
  GlobeIcon,
  XLogoIcon,
  iconSize,
} from '../../icons';
import type { IconComponent } from '../../icons';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

import {
  componentSizes,
  fontFamilyNative,
  useOpenLink,
  fontSize,
  lineHeight,
  semantic,
  spacing,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { BrandMark, Wordmark } from '../BrandMark';
import { Card } from '../Card';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';

const LINKS = {
  website: 'https://www.salmonwallet.io',
  twitter: 'https://x.com/salmonwallet',
  github: 'https://github.com/salmon-wallet',
  medium: 'https://medium.com/@salmonwallet',
  privacy: 'https://www.salmonwallet.io/privacy',
  terms: 'https://www.salmonwallet.io/terms',
} as const;

/** The leading well every link row carries — Settings' own row bubble size. */
const ROW_BUBBLE_SIZE = 40;
/** The round wells the social row draws. */
const SOCIAL_BUBBLE_SIZE = 44;

interface AboutPanelProps {
  onBack: () => void;
}

export function AboutPanel({ onBack }: AboutPanelProps) {
  const { t } = useTranslation();
  const openLink = useOpenLink();

  // Empty fallbacks on purpose: a missing version beats a wrong literal one.
  const appVersion = Constants.expoConfig?.version || '';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode?.toString() ||
    '';

  const renderLinkRow = useCallback(
    (Icon: IconComponent, label: string, url: string, id: string) => (
      <ListRow
        key={id}
        testID={`about-link-${id}`}
        leading={<IconBubble size={ROW_BUBBLE_SIZE} shape="rounded" tone="surface" icon={Icon} />}
        title={label}
        onPress={() => openLink(url)}
        trailing={<ArrowSquareOutIcon size={iconSize.sm} color={semantic.text.secondary} />}
      />
    ),
    [openLink]
  );

  const renderSocialButton = useCallback(
    (Icon: IconComponent, url: string, id: string) => (
      <IconBubble
        key={id}
        testID={`about-link-${id}`}
        size={SOCIAL_BUBBLE_SIZE}
        shape="rounded"
        tone="surface"
        icon={Icon}
        iconSize={iconSize.lg}
        onPress={() => openLink(url)}
      />
    ),
    [openLink]
  );

  return (
    <SettingsScreenLayout title={t('settings.about')} onBack={onBack}>
      {/* The drawn mark and name — BrandMark's own docs retired the raster
          Logo.png, and the Wordmark keeps the product's name a graphic at
          the same mark→name air the welcome and success screens use. */}
      <View style={styles.appInfo}>
        <BrandMark size={componentSizes.logoSizeMedium} />
        <Wordmark />
      </View>

      <View style={styles.socialSection}>
        <SectionLabel variant="caps" style={styles.socialLabel}>
          {t('actions.follow_us')}
        </SectionLabel>
        <View style={styles.socialButtons}>
          {renderSocialButton(XLogoIcon, LINKS.twitter, 'twitter')}
          {renderSocialButton(GithubLogoIcon, LINKS.github, 'github')}
          {renderSocialButton(BookOpenIcon, LINKS.medium, 'medium')}
        </View>
      </View>

      <Card padding="md" gap={spacing.sm}>
        <KeyValueRow label={t('settings.about_version_label')} value={appVersion || '—'} />
        <KeyValueRow label={t('settings.about_build_label')} value={buildNumber || '—'} />
      </Card>

      <View style={styles.linksSection}>
        {renderLinkRow(GlobeIcon, t('settings.about_website', 'Website'), LINKS.website, 'website')}
        {renderLinkRow(
          FileTextIcon,
          t('settings.about_privacy', 'Privacy Policy'),
          LINKS.privacy,
          'privacy'
        )}
        {renderLinkRow(
          FileIcon,
          t('settings.about_terms', 'Terms of Service'),
          LINKS.terms,
          'terms'
        )}
      </View>

      <Text style={styles.copyright}>
        {t('settings.about_copyright', { year: new Date().getFullYear() })}
      </Text>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  appInfo: {
    alignItems: 'center',
  },
  socialSection: {
    width: '100%',
  },
  socialLabel: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  linksSection: {
    width: '100%',
    gap: spacing.screenGutter,
  },
  copyright: {
    color: semantic.text.tertiary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    textAlign: 'center',
    lineHeight: fontSize.caption * lineHeight.normal,
  },
});

export default AboutPanel;
