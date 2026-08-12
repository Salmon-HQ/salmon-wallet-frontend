/**
 * AboutPanel – About/app info panel.
 * Extracted from the route file for use in the SettingsPanelStack.
 */

import React, { useCallback, type ComponentProps } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
} from '@salmon/shared';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { Logo } from '@salmon/assets';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

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
    (icon: IoniconsName, label: string, url: string, id: string) => (
      <TouchableOpacity
        testID={`about-link-${id}`}
        accessibilityRole="button"
        style={styles.linkItem}
        onPress={() => openLink(url)}
        activeOpacity={0.7}
      >
        <View style={styles.linkIconContainer}>
          <Ionicons name={icon} size={20} color={colors.text.primary} />
        </View>
        <Text style={styles.linkLabel}>{label}</Text>
        <Ionicons name="open-outline" size={18} color={colors.text.secondary} />
      </TouchableOpacity>
    ),
    [openLink]
  );

  const renderSocialButton = useCallback(
    (icon: IoniconsName, url: string, id: string) => (
      <TouchableOpacity
        testID={`about-link-${id}`}
        accessibilityRole="button"
        style={styles.socialButton}
        onPress={() => openLink(url)}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={24} color={colors.text.primary} />
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
          {renderSocialButton('logo-twitter', LINKS.twitter, 'twitter')}
          {renderSocialButton('logo-github', LINKS.github, 'github')}
          {renderSocialButton('book-outline', LINKS.medium, 'medium')}
        </View>
      </View>

      <View style={styles.linksSection}>
        {renderLinkItem(
          'globe-outline',
          t('settings.about_website', 'Website'),
          LINKS.website,
          'website'
        )}
        {renderLinkItem(
          'document-text-outline',
          t('settings.about_privacy', 'Privacy Policy'),
          LINKS.privacy,
          'privacy'
        )}
        {renderLinkItem(
          'document-outline',
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
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize['2xl'],
    marginBottom: spacing.xs,
  },
  versionText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.md,
    marginBottom: spacing.xxs,
  },
  buildText: {
    color: colors.text.tertiary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.base,
  },
  socialSection: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wider,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  socialButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linksSection: {
    width: '100%',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  linkIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  linkLabel: {
    flex: 1,
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.md,
  },
  copyright: {
    color: colors.text.tertiary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default AboutPanel;
