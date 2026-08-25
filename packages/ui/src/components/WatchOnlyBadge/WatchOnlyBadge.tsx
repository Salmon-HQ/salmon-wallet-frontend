import React from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { EyeIcon, iconSize } from '../../icons';
import { colors, semantic, spacing, borderRadius, fontSize, fontWeight } from '@salmon/shared';

export interface WatchOnlyBadgeProps {
  /** Test hook for the surface rendering the badge. */
  testID?: string;
}

/**
 * Marks a wallet the user can read but not operate.
 *
 * Deliberately quiet — it is a statement of fact about the wallet, not a
 * warning. The loud signal belongs on the actions that refuse, not on every
 * row in a list.
 */
export function WatchOnlyBadge({ testID = 'watch-only-badge' }: WatchOnlyBadgeProps) {
  const { t } = useTranslation();

  return (
    <Box
      data-testid={testID}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${spacing.xxs}px`,
        padding: `${spacing.xxs}px ${spacing.xs}px`,
        borderRadius: `${borderRadius.sm}px`,
        backgroundColor: semantic.surface.raised,
        flexShrink: 0,
      }}
    >
      <EyeIcon color={colors.text.secondary} size={iconSize.sm} />
      <Typography
        sx={{
          color: colors.text.secondary,
          fontSize: fontSize.caption,
          fontWeight: fontWeight.medium,
          lineHeight: 1,
        }}
      >
        {t('wallet.watchOnly.badge')}
      </Typography>
    </Box>
  );
}
