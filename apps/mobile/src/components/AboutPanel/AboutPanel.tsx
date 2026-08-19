/**
 * AboutPanel – About/app info panel.
 * Extracted from the route file for use in the SettingsPanelStack.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
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
  colors,
  spacing,
  borderRadius,
  componentSizes,
  fontFamilyNative,
  useOpenLink,
  fontSize,
  letterSpacing,
  lineHeight,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { Logo } from '@salmon/assets';

const LINKS = {
  website: 'https://www.salmonwallet.io',
  twitter: 'https://x.com/salmonwallet',
  github: 'https://github.com/salmon-wallet',
  medium: 'https://medium.com/@salmonwallet',
  privacy: 'https://www.salmonwallet.io/privacy',
  terms: 'https://www.salmonwallet.io/terms',
} as const;

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

  const renderLinkItem = useCallback(
    (Icon: IconComponent, label: string, url: string, id: string) => (
      <TouchableOpacity
        testID={`about-link-${id}`}
        accessibilityRole="button"
        style={styles.linkItem}
        onPress={() => openLink(url)}
        activeOpacity={0.7}
      >
        <View style={styles.linkIconContainer}>
          <Icon size={iconSize.md} color={semantic.text.primary} />
        </View>
        <Text style={styles.linkLabel}>{label}</Text>
        <ArrowSquareOutIcon size={iconSize.sm} color={semantic.text.secondary} />
      </TouchableOpacity>
    ),
    [openLink]
  );

  const renderSocialButton = useCallback(
    (Icon: IconComponent, url: string, id: string) => (
      <TouchableOpacity
        testID={`about-link-${id}`}
        accessibilityRole="button"
        style={styles.socialButton}
        onPress={() => openLink(url)}
        activeOpacity={0.7}
      >
        <Icon size={iconSize.lg} color={semantic.text.primary} />
      </TouchableOpacity>
    ),
    [openLink]
  );

  return (
    <SettingsScreenLayout title={t('settings.about')} onBack={onBack}>
      <View style={styles.appInfoSection}>
        <Image source={Logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>Salmon Wallet</Text>
        <Text style={styles.versionText}>{t('settings.app_version', { version: appVersion })}</Text>
        <Text style={styles.buildText}>{t('settings.about_build', { build: buildNumber })}</Text>
      </View>

      <View style={styles.socialSection}>
        <Text style={styles.sectionLabel}>{t('actions.follow_us')}</Text>
        <View style={styles.socialButtons}>
          {renderSocialButton(XLogoIcon, LINKS.twitter, 'twitter')}
          {renderSocialButton(GithubLogoIcon, LINKS.github, 'github')}
          {renderSocialButton(BookOpenIcon, LINKS.medium, 'medium')}
        </View>
      </View>

      <View style={styles.linksSection}>
        {renderLinkItem(
          GlobeIcon,
          t('settings.about_website', 'Website'),
          LINKS.website,
          'website'
        )}
        {renderLinkItem(
          FileTextIcon,
          t('settings.about_privacy', 'Privacy Policy'),
          LINKS.privacy,
          'privacy'
        )}
        {renderLinkItem(
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
  appInfoSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: componentSizes.logoSizeMedium,
    height: componentSizes.logoSizeMedium,
    marginBottom: spacing.lg,
  },
  appName: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.headline,
    marginBottom: spacing.xs,
  },
  versionText: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
    marginBottom: spacing.xxs,
  },
  buildText: {
    color: semantic.text.tertiary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.body,
  },
  socialSection: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  // The `label` role: 10/600/uppercase/+0.3px, as the other on-system
  // surfaces render section labels.
  sectionLabel: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.semiBold,
    fontSize: fontSize.label,
    textAlign: 'center',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  socialButton: {
    width: componentSizes.iconSize3XL,
    height: componentSizes.iconSize3XL,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linksSection: {
    width: '100%',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.r3,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    // Per-Plane Border Rule: this divider sits above the shelf, where
    // `border.default` drops under 3:1 — `raised` clears it.
    borderBottomColor: semantic.border.raised,
  },
  linkIconContainer: {
    width: componentSizes.iconSizeLarge,
    height: componentSizes.iconSizeLarge,
    borderRadius: borderRadius.r1,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  linkLabel: {
    flex: 1,
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
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
