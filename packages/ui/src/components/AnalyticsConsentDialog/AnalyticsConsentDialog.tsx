import React from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { colors } from '@salmon/shared';

/**
 * First-run, opt-in consent prompt for anonymous usage analytics. Shown once
 * after onboarding on web and extension. Presentational only — the caller wires
 * it to `useAnalyticsConsent` (open when `needsConsentPrompt`, resolve on click).
 */
export interface AnalyticsConsentDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function AnalyticsConsentDialog({
  open,
  onAccept,
  onDecline,
}: AnalyticsConsentDialogProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onDecline}
      data-testid="analytics-consent-dialog"
      slotProps={{ paper: { sx: { borderRadius: '16px', backgroundColor: colors.background.secondary, maxWidth: 420 } } }}
    >
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: colors.text.primary }}>
          {t('settings.analytics_prompt_title')}
        </Typography>
        <Typography sx={{ color: colors.text.secondary, lineHeight: 1.5 }}>
          {t('settings.analytics_prompt_body')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, my: 0.5 }}>
          <Typography sx={{ color: colors.text.secondary }}>
            {'✓ '}{t('settings.analytics_prompt_include')}
          </Typography>
          <Typography sx={{ color: colors.text.secondary }}>
            {'✕ '}{t('settings.analytics_prompt_exclude')}
          </Typography>
        </Box>
        <Typography sx={{ color: colors.text.secondary, fontSize: '0.85rem', opacity: 0.8 }}>
          {t('settings.analytics_prompt_footnote')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            fullWidth
            variant="text"
            onClick={onDecline}
            data-testid="analytics-consent-decline"
            sx={{ color: colors.text.secondary, textTransform: 'none' }}
          >
            {t('settings.analytics_prompt_decline')}
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={onAccept}
            data-testid="analytics-consent-accept"
            sx={{
              backgroundColor: colors.accent.primary,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { backgroundColor: colors.accent.primary },
            }}
          >
            {t('settings.analytics_prompt_accept')}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
