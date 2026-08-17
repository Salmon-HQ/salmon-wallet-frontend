import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff';
import CloseIcon from '@mui/icons-material/Close';
import { borderRadius, fontSize, fontWeight, semantic, spacing } from '@salmon/shared';
import type { PendingActivityItem } from '@salmon/shared';
import type { PendingActivityBannerProps } from './types';

/**
 * Ink + icon for each outcome. Every row therefore carries its state in three
 * channels — opaque color, icon, and label — per DESIGN.md's Three-Channel
 * State Rule; none of them is the hue alone. Nothing here uses a salmon fill:
 * this banner floats over whatever screen owns the one fill on it.
 */
const TONE = {
  pending: { color: semantic.text.secondary, Icon: null },
  confirmed: { color: semantic.status.success, Icon: CheckCircleOutlineIcon },
  failed: { color: semantic.status.danger, Icon: ErrorOutlineIcon },
  expired: { color: semantic.status.warning, Icon: HistoryToggleOffIcon },
} as const;

/**
 * The one surface that reports work still in the air — a signed send or swap
 * waiting on the cluster, or a bridge order waiting on StealthEX. It is mounted
 * above the router rather than inside a screen so that leaving the screen the
 * transaction was signed on never costs the user the outcome.
 *
 * Opaque by rule: it overlaps scrolling content, so it gets a hard surface, not
 * glass.
 */
export function PendingActivityBanner({
  items,
  onDismiss,
  style,
}: PendingActivityBannerProps): ReactNode {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <Box
      role="status"
      aria-live="polite"
      data-testid="pending-activity-banner"
      sx={{
        position: 'fixed',
        top: `${spacing.sm}px`,
        left: `${spacing.sm}px`,
        right: `${spacing.sm}px`,
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        gap: `${spacing.xs}px`,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {items.map((item: PendingActivityItem) => {
        const tone = TONE[item.status];
        const title = t(`pending.${item.kind}.${item.status}`);
        return (
          <Box
            key={item.id}
            data-testid={`pending-activity-row-${item.status}`}
            sx={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: `${spacing.sm}px`,
              padding: `${spacing.sm}px`,
              borderRadius: `${borderRadius.lg}px`,
              backgroundColor: semantic.surface.crest,
              border: `1px solid ${semantic.border.raised}`,
            }}
          >
            {tone.Icon ? (
              <tone.Icon sx={{ fontSize: 20, color: tone.color, flexShrink: 0 }} />
            ) : (
              <CircularProgress size={16} sx={{ color: tone.color, flexShrink: 0 }} />
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  color: tone.color,
                  fontSize: `${fontSize.sm}px`,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {title}
              </Typography>
              {item.detail ? (
                <Typography
                  sx={{
                    color: semantic.text.secondary,
                    fontSize: `${fontSize.xs}px`,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {item.detail}
                </Typography>
              ) : null}
              {item.status === 'expired' ? (
                <Typography sx={{ color: semantic.text.secondary, fontSize: `${fontSize.xs}px` }}>
                  {t('pending.expiredHint')}
                </Typography>
              ) : null}
            </Box>
            {item.dismissible && item.status !== 'pending' ? (
              <IconButton
                size="small"
                aria-label={t('pending.dismiss')}
                onClick={() => onDismiss(item.id)}
                sx={{ color: semantic.text.tertiary, flexShrink: 0 }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
