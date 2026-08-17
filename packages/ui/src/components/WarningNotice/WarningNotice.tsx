import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { WarningIcon, iconSize } from '../../icons';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@salmon/shared';
import { styled } from '../../utils/styled';
import type { WarningNoticeProps } from './types';

const WarningBannerRoot = styled(Box)({
  display: 'flex',
  gap: spacing.sm,
  alignItems: 'flex-start',
  boxSizing: 'border-box',
  width: '100%',
  padding: spacing.md,
  borderRadius: borderRadius.lg,
  border: '1px solid',
});

/**
 * Consistent, icon-led alert banner shared by every approval screen — the
 * tx-lookalike "Signing blocked", the SIWS domain-mismatch block, and the
 * insecure-origin advisory. The triangle icon and tone color make security
 * state impossible to miss while staying within the dark palette.
 */
export function WarningNotice({
  tone = 'error',
  title,
  children,
  action,
}: WarningNoticeProps): ReactNode {
  const accent = tone === 'warning' ? colors.status.warning : colors.status.error;
  const background =
    tone === 'warning' ? colors.status.warningBackground : colors.status.errorBackground;

  return (
    <WarningBannerRoot sx={{ backgroundColor: background, borderColor: accent }}>
      <WarningIcon size={iconSize.md} color={accent} style={{ flexShrink: 0, marginTop: '1px' }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            color: accent,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            marginBottom: '2px',
          }}
        >
          {title}
        </Typography>
        {children != null && (
          <Typography
            sx={{
              color: colors.text.primary,
              fontSize: fontSize.sm,
              lineHeight: 1.45,
              overflowWrap: 'anywhere',
            }}
          >
            {children}
          </Typography>
        )}
        {action != null && <Box sx={{ marginTop: '6px' }}>{action}</Box>}
      </Box>
    </WarningBannerRoot>
  );
}
