/**
 * SupportSelector - Help & Support component for mobile
 *
 * Displays a list of support options (FAQ, docs, social, email)
 * with a security notice about seed phrase protection.
 */

import React, { useCallback, type ComponentProps } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import {
  colors,
  spacing,
  borderRadius,
  fontFamilyNative,
  type SupportSelectorBaseProps,
  type SupportOptionItem,
  fontSize,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../SettingsScreenLayout';

// ============================================================================
// Icon mapping
// ============================================================================

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

const ICON_MAP: Record<string, IoniconsName> = {
  faq: 'help-circle-outline',
  docs: 'book-outline',
  twitter: 'logo-twitter',
  discord: 'logo-discord',
  email: 'mail-outline',
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
      >
        <View style={styles.optionIconContainer}>
          <Ionicons
            name={ICON_MAP[option.id] || 'help-circle-outline'}
            size={24}
            color={colors.accent.primary}
          />
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>{option.title}</Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
      </TouchableOpacity>
    ),
    [onOpenLink]
  );

  return (
    <SettingsScreenLayout title={t('settings.help_support', 'Help & Support')} onBack={onBack}>
      {options.map(renderOption)}

      <View style={styles.securityNotice}>
        <Ionicons name="shield-checkmark-outline" size={20} color={semantic.status.warning} />
        <Text style={styles.securityText}>
          {t(
            'settings.security_notice',
            'Salmon Wallet team will never ask for your seed phrase or private keys. Never share this information with anyone.'
          )}
        </Text>
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
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.md,
    marginBottom: spacing.xxs,
  },
  optionDescription: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 13,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.status.warningBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  securityText: {
    flex: 1,
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});
