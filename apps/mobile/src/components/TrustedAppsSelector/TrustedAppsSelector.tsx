/**
 * TrustedAppsSelector - Connected dApps management component for mobile
 *
 * Displays a list of trusted/connected dApps for the current network
 * and allows the user to revoke their access.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import {
  colors,
  spacing,
  borderRadius,
  fontFamilyNative,
  type TrustedAppsSelectorBaseProps,
  type TrustedAppItem,
  fontSize,
  opacity,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../SettingsScreenLayout';

// ============================================================================
// Component
// ============================================================================

export function TrustedAppsSelector({ apps, onRevokeApp, onBack }: TrustedAppsSelectorBaseProps) {
  const { t } = useTranslation();
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = useCallback(
    async (domain: string) => {
      setRevoking(domain);
      try {
        await onRevokeApp(domain);
      } finally {
        setRevoking(null);
      }
    },
    [onRevokeApp]
  );

  const renderAppItem = useCallback(
    (app: TrustedAppItem) => {
      const isRevoking = revoking === app.domain;

      return (
        <View key={app.domain} style={styles.appItem}>
          <View style={styles.appInfo}>
            {app.icon ? (
              <Image source={{ uri: app.icon }} style={styles.appIcon} />
            ) : (
              <View style={styles.appIconPlaceholder}>
                <Ionicons name="globe-outline" size={20} color={colors.text.secondary} />
              </View>
            )}
            <View style={styles.appText}>
              <Text style={styles.appName} numberOfLines={1}>
                {app.name || app.domain}
              </Text>
              {app.name && (
                <Text style={styles.appDomain} numberOfLines={1}>
                  {app.domain}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.revokeButton, isRevoking && styles.revokeButtonDisabled]}
            onPress={() => handleRevoke(app.domain)}
            disabled={isRevoking}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={colors.status.error} />
          </TouchableOpacity>
        </View>
      );
    },
    [revoking, handleRevoke]
  );

  return (
    <SettingsScreenLayout title={t('settings.trusted_apps', 'Trusted Apps')} onBack={onBack}>
      {apps.length > 0 ? (
        apps.map(renderAppItem)
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('settings.no_trusted_apps', 'No connected apps')}</Text>
          <Text style={styles.emptySubtext}>
            {t('settings.no_trusted_apps_hint', 'Apps you connect to will appear here')}
          </Text>
        </View>
      )}
    </SettingsScreenLayout>
  );
}

export default TrustedAppsSelector;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.iconContainer,
    backgroundColor: colors.card.border,
  },
  appIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.iconContainer,
    backgroundColor: colors.card.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appText: {
    flex: 1,
    marginLeft: spacing.md,
    gap: spacing.xxs,
  },
  appName: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.md,
  },
  appDomain: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 13,
  },
  revokeButton: {
    padding: spacing.sm,
  },
  revokeButtonDisabled: {
    opacity: opacity.faint,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  emptySubtext: {
    color: semantic.text.disabled,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
