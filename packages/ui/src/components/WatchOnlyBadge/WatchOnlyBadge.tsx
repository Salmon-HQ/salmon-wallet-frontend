/**
 * WatchOnlyBadge — marks a wallet the user can read but not operate, on the
 * DOM.
 *
 * The mobile twin is `apps/mobile/src/components/WatchOnlyBadge`. Deliberately
 * quiet — it is a statement of fact about the wallet, not a warning. The loud
 * signal belongs on the actions that refuse, not on every row in a list.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  type WatchOnlyBadgePropsBase,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { EyeIcon, iconSize } from '../../icons';

export interface WatchOnlyBadgeProps extends WatchOnlyBadgePropsBase {}

export function WatchOnlyBadge({ testID = 'watch-only-badge' }: WatchOnlyBadgeProps) {
  const { t } = useTranslation();
  const { surface, text } = useSemantic();

  return (
    <span
      data-testid={testID}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xxs,
        padding: `${spacing.xxs}px ${spacing.xs}px`,
        borderRadius: borderRadius.sm,
        backgroundColor: surface.raised,
        flexShrink: 0,
      }}
    >
      <EyeIcon color={text.secondary} size={iconSize.sm} />
      <span
        style={{
          color: text.secondary,
          fontFamily: fontFamily.sans,
          fontSize: fontSize.caption,
          fontWeight: fontWeight.medium,
          lineHeight: 1,
        }}
      >
        {t('wallet.watchOnly.badge')}
      </span>
    </span>
  );
}
