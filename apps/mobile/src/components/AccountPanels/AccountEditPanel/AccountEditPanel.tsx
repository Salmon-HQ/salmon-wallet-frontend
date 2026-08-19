/**
 * AccountEditPanel - Account editing options for mobile
 *
 * Displays a settings-style list with sections for editing name, avatar,
 * backing up seed phrase, and exporting private key.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CaretRightIcon, KeyIcon, LockIcon, TextTIcon, UserCircleIcon, iconSize } from '../../../icons';
import type { IconComponent } from '../../../icons';
import { useTranslation } from 'react-i18next';

import {
  colors,
  componentSizes,
  spacing,
  borderRadius,
  fontSize,
  fontFamilyNative,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import type { AccountEditPanelProps } from './types';

// ============================================================================
// Types
// ============================================================================

interface SectionItem {
  labelKey: string;
  icon: IconComponent;
  onPress: () => void;
  testID: string;
}

// ============================================================================
// Component
// ============================================================================

export function AccountEditPanel({
  account,
  onEditName,
  onEditAvatar,
  onBackupSeed,
  onExportPrivateKey,
  onBack,
}: AccountEditPanelProps): React.ReactElement {
  const { t } = useTranslation();

  const sections: SectionItem[] = [
    {
      labelKey: 'settings.account_edit.name_section',
      icon: TextTIcon,
      onPress: onEditName,
      testID: 'account-edit-name',
    },
    {
      labelKey: 'settings.account_edit.avatar_section',
      icon: UserCircleIcon,
      onPress: onEditAvatar,
      testID: 'account-edit-avatar',
    },
    {
      labelKey: 'settings.account_edit.backup_section',
      icon: KeyIcon,
      onPress: onBackupSeed,
      testID: 'account-edit-backup',
    },
    {
      labelKey: 'settings.account_edit.private_key_section',
      icon: LockIcon,
      onPress: onExportPrivateKey,
      testID: 'account-edit-private-key',
    },
  ];

  return (
    <SettingsScreenLayout
      title={t('settings.account_edit.title')}
      subtitle={account.name}
      onBack={onBack}
    >
      <View style={styles.sectionContainer}>
        {sections.map((item, index) => (
          <TouchableOpacity
            key={item.labelKey}
            testID={item.testID}
            style={[styles.row, index < sections.length - 1 && styles.rowBorder]}
            onPress={item.onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t(item.labelKey)}
          >
            <View style={styles.iconContainer}>
              <item.icon size={iconSize.lg} color={semantic.text.primary} />
            </View>
            <Text style={styles.rowLabel}>{t(item.labelKey)}</Text>
            <CaretRightIcon size={iconSize.md} color={semantic.text.secondary} />
          </TouchableOpacity>
        ))}
      </View>
    </SettingsScreenLayout>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  sectionContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.r3,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: semantic.border.default,
  },
  iconContainer: {
    width: componentSizes.iconSize2XL,
    height: componentSizes.iconSize2XL,
    borderRadius: borderRadius.r2,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowLabel: {
    flex: 1,
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
  },
});
