/**
 * SupportSelector - Help & Support component for mobile
 *
 * Displays a list of support options (FAQ, docs, social, email)
 * with a security notice about seed phrase protection.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  ArrowSquareOutIcon,
  BookOpenIcon,
  DiscordLogoIcon,
  EnvelopeIcon,
  QuestionIcon,
  ShieldCheckIcon,
  XLogoIcon,
  iconSize,
} from '../../icons';
import type { IconComponent } from '../../icons';
import { useTranslation } from 'react-i18next';

import {
  colors,
  componentSizes,
  spacing,
  borderRadius,
  fontFamilyNative,
  type SupportSelectorBaseProps,
  type SupportOptionItem,
  fontSize,
  lineHeight,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../SettingsScreenLayout';

// ============================================================================
// Icon mapping
// ============================================================================

const ICON_MAP: Record<string, IconComponent> = {
  faq: QuestionIcon,
  docs: BookOpenIcon,
  twitter: XLogoIcon,
  discord: DiscordLogoIcon,
  email: EnvelopeIcon,
};

// ============================================================================
// Component
// ============================================================================

export function SupportSelector({ options, onOpenLink, onBack }: SupportSelectorBaseProps) {
  const { t } = useTranslation();

  const renderOption = useCallback(
    (option: SupportOptionItem) => (
      <TouchableOpacity
        key={option.id}
        style={styles.optionCard}
        onPress={() => onOpenLink(option.url)}
        activeOpacity={0.7}
        // Every row leaves the app for an external URL (docs, social, mailto),
        // so each one is a link, not a button.
        accessibilityRole="link"
      >
        <View style={styles.optionIconContainer}>
          {React.createElement(ICON_MAP[option.id] || QuestionIcon, {
            size: iconSize.lg,
            color: semantic.accent.ink,
          })}
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>{t(option.title)}</Text>
          <Text style={styles.optionDescription}>{t(option.description)}</Text>
        </View>
        {/* Leaving the app is not the same promise as pushing a panel: the
            right-pointing caret means "slides in from there", which internal
            navigation no longer does and this row never did. The external
            glyph says the destination is outside the wallet. */}
        <ArrowSquareOutIcon size={iconSize.md} color={semantic.text.tertiary} />
      </TouchableOpacity>
    ),
    [onOpenLink, t]
  );

  return (
    <SettingsScreenLayout title={t('settings.help_support')} onBack={onBack}>
      {options.map(renderOption)}

      <View style={styles.securityNotice}>
        <ShieldCheckIcon size={iconSize.md} color={semantic.status.warning} />
        <Text style={styles.securityText}>{t('settings.security_notice')}</Text>
      </View>
    </SettingsScreenLayout>
  );
}

export default SupportSelector;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.r3,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionIconContainer: {
    width: componentSizes.iconSize3XL,
    height: componentSizes.iconSize3XL,
    borderRadius: borderRadius.r2,
    backgroundColor: semantic.accent.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
    marginBottom: spacing.xxs,
  },
  optionDescription: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.mono,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: semantic.status.warningTint,
    borderRadius: borderRadius.r2,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  securityText: {
    flex: 1,
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.mono,
    lineHeight: fontSize.mono * lineHeight.snug,
  },
});
