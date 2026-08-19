/**
 * PendingActivityBanner (mobile) — the visible half of the global pending
 * transaction state.
 *
 * Mounted in the root layout rather than inside a screen: the whole point is
 * that leaving the screen a transaction was signed on no longer costs the user
 * the outcome. Backgrounding the app locks the wallet immediately, so this is
 * also what an unlocking user sees when they come back mid-flight.
 */

import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, ClockIcon, WarningCircleIcon, XIcon, iconSize } from '../../icons';
import type { IconComponent } from '../../icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, fontSize, fontWeight, semantic, spacing } from '@salmon/shared';
import type { PendingActivityBannerPropsBase, PendingActivityItem } from '@salmon/shared';

export type PendingActivityBannerProps = PendingActivityBannerPropsBase<ViewStyle>;

/**
 * Ink + icon per outcome, so every row carries its state in three channels —
 * opaque color, icon, and label — never hue alone (DESIGN.md, Three-Channel
 * State Rule). No salmon fill: the screen underneath owns the one fill.
 */
const TONE: Record<
  PendingActivityItem['status'],
  { color: string; icon: IconComponent | null }
> = {
  pending: { color: semantic.text.secondary, icon: null },
  confirmed: { color: semantic.status.success, icon: CheckCircleIcon },
  failed: { color: semantic.status.danger, icon: WarningCircleIcon },
  expired: { color: semantic.status.warning, icon: ClockIcon },
};

export function PendingActivityBanner({ items, onDismiss, style }: PendingActivityBannerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (items.length === 0) return null;

  return (
    <View
      style={[styles.container, { top: insets.top + spacing.sm }, style]}
      pointerEvents="box-none"
      testID="pending-activity-banner"
      accessibilityLiveRegion="polite"
    >
      {items.map((item) => {
        const tone = TONE[item.status];
        return (
          <View key={item.id} style={styles.row} testID={`pending-activity-row-${item.status}`}>
            {tone.icon ? (
              <tone.icon size={iconSize.md} color={tone.color} />
            ) : (
              <ActivityIndicator size="small" color={tone.color} />
            )}
            <View style={styles.body}>
              <Text style={[styles.title, { color: tone.color }]}>
                {t(`pending.${item.kind}.${item.status}`)}
              </Text>
              {item.detail ? (
                <Text style={styles.detail} numberOfLines={1}>
                  {item.detail}
                </Text>
              ) : null}
              {item.status === 'expired' ? (
                <Text style={styles.detail}>{t('pending.expiredHint')}</Text>
              ) : null}
            </View>
            {item.dismissible && item.status !== 'pending' ? (
              <Pressable
                onPress={() => onDismiss(item.id)}
                accessibilityRole="button"
                accessibilityLabel={t('pending.dismiss')}
                testID={`pending-activity-dismiss-${item.id}`}
                hitSlop={8}
              >
                <XIcon size={iconSize.sm} color={semantic.text.tertiary} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    // Opaque by rule: this overlaps scrolling content, so it is a hard surface.
    backgroundColor: semantic.surface.crest,
    borderWidth: 1,
    borderColor: semantic.border.raised,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  detail: {
    fontSize: fontSize.xs,
    color: semantic.text.secondary,
  },
});
