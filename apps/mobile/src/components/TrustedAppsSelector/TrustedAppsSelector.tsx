/**
 * TrustedAppsSelector - Connected dApps management component for mobile
 *
 * A `ListRow` per connected dApp — its icon or a `GlobeIcon` fallback
 * leading, name and domain stacked, a revoke trash trailing. Empty state is
 * a heading and a line of copy, not a warning: nothing here failed.
 */

import React, { useCallback, useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { GlobeIcon, TrashIcon, iconSize } from '../../icons';
import { useTranslation } from 'react-i18next';

import {
  type TrustedAppsSelectorBaseProps,
  type TrustedAppItem,
  type Semantic,
  spacing,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { useThemedStyles, useSemantic } from '../../theme/useThemedStyles';

/** The leading well every app row carries — Settings' own row bubble size. */
const ROW_BUBBLE_SIZE = 40;

export function TrustedAppsSelector({ apps, onRevokeApp, onBack }: TrustedAppsSelectorBaseProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text, status } = useSemantic();
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

  const renderAppRow = useCallback(
    (app: TrustedAppItem) => {
      const isRevoking = revoking === app.domain;

      return (
        <ListRow
          key={app.domain}
          testID={`trusted-app-${app.domain}`}
          leading={
            <IconBubble size={ROW_BUBBLE_SIZE} shape="circle" tone="surface">
              {app.icon ? (
                <Image source={{ uri: app.icon }} style={styles.appIcon} />
              ) : (
                <GlobeIcon size={iconSize.md} color={text.secondary} />
              )}
            </IconBubble>
          }
          title={app.name || app.domain}
          subtitle={app.name ? app.domain : undefined}
          trailing={
            <IconBubble
              testID={`trusted-app-revoke-${app.domain}`}
              size={ROW_BUBBLE_SIZE}
              tone="ghost"
              icon={TrashIcon}
              iconSize={iconSize.sm}
              iconColor={status.danger}
              onPress={() => handleRevoke(app.domain)}
              disabled={isRevoking}
              accessibilityLabel={t('settings.trusted_apps_revoke', 'Revoke')}
            />
          }
        />
      );
    },
    [handleRevoke, revoking, t, text, status, styles]
  );

  return (
    <SettingsScreenLayout title={t('settings.trusted_apps', 'Trusted Apps')} onBack={onBack}>
      {apps.length > 0 ? (
        apps.map(renderAppRow)
      ) : (
        <View style={styles.emptyContainer}>
          <SectionLabel variant="title" style={styles.emptyCentered}>
            {t('settings.no_trusted_apps', 'No connected apps')}
          </SectionLabel>
          <SectionLabel variant="group" style={[styles.emptyCentered, styles.emptyHint]}>
            {t('settings.no_trusted_apps_hint', 'Apps you connect to will appear here')}
          </SectionLabel>
        </View>
      )}
    </SettingsScreenLayout>
  );
}

export default TrustedAppsSelector;

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    appIcon: {
      width: '100%',
      height: '100%',
      borderRadius: ROW_BUBBLE_SIZE / 2,
    },
    emptyContainer: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing['2xl'],
    },
    emptyCentered: {
      textAlign: 'center',
    },
    emptyHint: {
      color: t.text.tertiary,
    },
  });
