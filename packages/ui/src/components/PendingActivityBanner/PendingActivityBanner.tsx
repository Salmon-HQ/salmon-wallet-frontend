/**
 * PendingActivityBanner (DOM) — the visible half of the global pending
 * transaction state.
 *
 * Mounted above the router rather than inside a screen: the whole point is
 * that leaving the screen a transaction was signed on no longer costs the
 * user the outcome. The mobile twin is
 * `apps/mobile/src/components/PendingActivityBanner`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  type PendingActivityItem,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import {
  CheckCircleIcon,
  ClockIcon,
  WarningCircleIcon,
  XIcon,
  iconSize,
  type IconComponent,
} from '../../icons';
import { ButtonSpinner } from '../Button/ButtonSpinner';
import type { PendingActivityBannerProps } from './types';

/** The banner sits over every screen. */
const BANNER_Z_INDEX = 1000;

/**
 * Ink + icon per outcome, so every row carries its state in three channels —
 * opaque color, icon, and label — never hue alone (DESIGN.md, Three-Channel
 * State Rule). No salmon fill: the screen underneath owns the one fill.
 */
const toneFor = (
  t: Semantic
): Record<PendingActivityItem['status'], { color: string; icon: IconComponent | null }> => ({
  pending: { color: t.text.secondary, icon: null },
  confirmed: { color: t.status.success, icon: CheckCircleIcon },
  failed: { color: t.status.danger, icon: WarningCircleIcon },
  expired: { color: t.status.warning, icon: ClockIcon },
});

export function PendingActivityBanner({ items, onDismiss, style }: PendingActivityBannerProps) {
  const { t: translate } = useTranslation();
  const t = useSemantic();
  const TONE = toneFor(t);

  if (items.length === 0) return null;

  const detailStyle: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    color: t.text.secondary,
    overflowWrap: 'anywhere',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="pending-activity-banner"
      style={{
        position: 'fixed',
        top: spacing.sm,
        left: spacing.md,
        right: spacing.md,
        zIndex: BANNER_Z_INDEX,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xs,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {items.map((item) => {
        const tone = TONE[item.status];
        const Icon = tone.icon;
        return (
          <div
            key={item.id}
            data-testid={`pending-activity-row-${item.status}`}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.sm,
              borderRadius: borderRadius.lg,
              // Opaque by rule: this overlaps scrolling content, so it is a hard surface.
              backgroundColor: t.surface.crest,
              border: `${borderWidth.thin}px solid ${t.border.raised}`,
            }}
          >
            {Icon ? (
              <Icon size={iconSize.md} color={tone.color} />
            ) : (
              <ButtonSpinner color={tone.color} size={iconSize.sm} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  color: tone.color,
                }}
              >
                {translate(`pending.${item.kind}.${item.status}`)}
              </div>
              {item.detail ? (
                <div
                  style={{
                    ...detailStyle,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.detail}
                </div>
              ) : null}
              {item.status === 'expired' ? (
                <div style={detailStyle}>{translate('pending.expiredHint')}</div>
              ) : null}
            </div>
            {item.dismissible && item.status !== 'pending' ? (
              <button
                type="button"
                aria-label={translate('pending.dismiss')}
                data-testid={`pending-activity-dismiss-${item.id}`}
                onClick={() => onDismiss(item.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: spacing.xs,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: t.text.tertiary,
                }}
              >
                <XIcon size={iconSize.sm} color={t.text.tertiary} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
