/**
 * BackupPanel - Backup options page
 *
 * This page provides backup functionality for the wallet, including:
 * - Viewing the seed phrase (mnemonic)
 * - Security warnings about protecting backup data
 *
 * The seed phrase is revealed only after user confirmation
 * to prevent accidental exposure.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import { CheckIcon, CopyIcon, EyeIcon, EyeSlashIcon, KeyIcon, WarningIcon } from '../../icons';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  useAccountsContext,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  opacity,
  componentSizes,
  duration,
  useCopyFeedback,
} from '@salmon/shared';
import { ConfirmDialog } from '../ConfirmDialog';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { WarningNotice } from '../WarningNotice';
import type { BackupPanelProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const PageContent = styled(Box)({
  padding: spacing.lg,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.lg,
});

const WarningAlert = styled(Alert)({
  backgroundColor: colors.status.warningBackground,
  border: `${borderWidth.thin}px solid ${colors.status.warningBorder}`,
  '& .MuiAlert-icon': {
    color: colors.status.warning,
  },
  '& .MuiAlert-message': {
    color: colors.text.primary,
  },
});

const SeedPhraseCard = styled(Paper)({
  backgroundColor: colors.background.card,
  padding: spacing.lg,
  borderRadius: borderRadius.lg,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
  position: 'relative',
});

const SeedPhraseGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: spacing.sm,
});

const WordChip = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xs,
  padding: `${spacing.sm}px ${spacing.md}px`,
  backgroundColor: colors.background.primary,
  borderRadius: borderRadius.md,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
});

const WordNumber = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
  minWidth: componentSizes.iconSizeXs,
});

const WordText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
  fontFamily: fontFamily.mono,
});

const BlurOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.overlay.dark,
  borderRadius: borderRadius.lg,
  gap: spacing.md,
  cursor: 'pointer',
  transition: `background-color ${duration.normal}`,
  '&:hover': {
    backgroundColor: colors.overlay.darkHover,
  },
});

const RevealText = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
});

const ActionRow = styled(Box)({
  display: 'flex',
  gap: spacing.sm,
  marginTop: spacing.md,
});

const ActionButton = styled(Button)({
  flex: 1,
  textTransform: 'none',
  fontWeight: fontWeight.medium,
  borderRadius: borderRadius.md,
});

const CopyButton = styled(ActionButton)({
  backgroundColor: colors.background.card,
  color: colors.text.primary,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
  '&:hover': {
    backgroundColor: colors.card.border,
    borderColor: colors.border.light,
  },
});

const SectionLabel = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: colors.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.wider,
  marginBottom: spacing.sm,
});

// ============================================================================
// Component
// ============================================================================

export function BackupPanel({ onBack }: BackupPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [state, actions] = useAccountsContext();
  const { activeAccount } = state;

  const [seedPhraseVisible, setSeedPhraseVisible] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const { copied, trigger: showCopied } = useCopyFeedback();
  const [copyFailed, setCopyFailed] = useState(false);

  // Get the mnemonic from the active account
  const mnemonic = useMemo(() => {
    return activeAccount?.mnemonic || '';
  }, [activeAccount]);

  const words = useMemo(() => {
    return mnemonic.split(' ').filter((w) => w.length > 0);
  }, [mnemonic]);

  // An unlocked session is not proof of identity — it only proves the phone or
  // laptop was left open. The password is asked again before the phrase, the
  // one secret that hands over every account forever, comes into view.
  const handleReveal = useCallback(() => {
    setReauthOpen(true);
  }, []);

  const handleReauthenticated = useCallback(async () => {
    setSeedPhraseVisible(true);
  }, []);

  const handleHide = useCallback(() => {
    setSeedPhraseVisible(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!mnemonic) return;
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopyFailed(false);
      showCopied();
    } catch {
      // A silent copy failure here means the user thinks the seed is saved.
      setCopyFailed(true);
    }
  }, [mnemonic, showCopied]);

  // If no mnemonic (imported via private key), show message
  const hasNoMnemonic = !mnemonic || words.length === 0;

  return (
    <SettingsPanelContent title={t('settings.backup', 'Backup Wallet')} onBack={onBack}>
      <PageContent>
        <WarningAlert severity="warning" icon={<WarningIcon />}>
          <Typography variant="body2" sx={{ fontWeight: fontWeight.medium }}>
            {t('settings.backup_warning_title', 'Never share your recovery phrase')}
          </Typography>
          <Typography variant="body2" sx={{ mt: `${spacing.xs}px`, opacity: opacity.soft }}>
            {t(
              'settings.backup_warning_description',
              'Anyone with your recovery phrase can access your funds. Keep it stored securely and never enter it on websites.'
            )}
          </Typography>
        </WarningAlert>

        {hasNoMnemonic ? (
          <Alert severity="info" sx={{ backgroundColor: colors.background.card }}>
            <Typography variant="body2" color="text.primary">
              {t(
                'settings.no_seed_phrase',
                'This account was imported using a private key and does not have a recovery phrase.'
              )}
            </Typography>
          </Alert>
        ) : (
          <>
            <Box>
              <SectionLabel>{t('settings.recovery_phrase', 'Recovery Phrase')}</SectionLabel>
              <SeedPhraseCard data-testid="backup-seed-phrase">
                <SeedPhraseGrid>
                  {words.map((word, index) => (
                    <WordChip key={index}>
                      <WordNumber>{index + 1}.</WordNumber>
                      <WordText>{seedPhraseVisible ? word : '****'}</WordText>
                    </WordChip>
                  ))}
                </SeedPhraseGrid>

                {!seedPhraseVisible && (
                  <BlurOverlay onClick={handleReveal} data-testid="backup-seed-reveal-overlay">
                    <KeyIcon size={fontSize.iconLg} color={colors.text.secondary} />
                    <RevealText>{t('settings.tap_to_reveal', 'Tap to reveal')}</RevealText>
                  </BlurOverlay>
                )}
              </SeedPhraseCard>

              <ActionRow>
                <Tooltip title={copied ? t('actions.copied', 'Copied!') : ''} open={copied}>
                  <CopyButton
                    variant="outlined"
                    startIcon={copied ? <CheckIcon color={colors.status.success} /> : <CopyIcon />}
                    onClick={handleCopy}
                    disabled={!seedPhraseVisible}
                    data-testid="backup-seed-copy-button"
                  >
                    {copied ? t('actions.copied', 'Copied!') : t('actions.copy', 'Copy')}
                  </CopyButton>
                </Tooltip>
                <ActionButton
                  variant="outlined"
                  startIcon={seedPhraseVisible ? <EyeSlashIcon /> : <EyeIcon />}
                  onClick={seedPhraseVisible ? handleHide : handleReveal}
                  data-testid="backup-seed-reveal-button"
                  sx={{
                    backgroundColor: seedPhraseVisible
                      ? colors.accent.primary
                      : colors.background.card,
                    color: seedPhraseVisible ? colors.text.primary : colors.text.primary,
                    border: `${borderWidth.thin}px solid ${
                      seedPhraseVisible ? colors.accent.primary : colors.border.default
                    }`,
                    '&:hover': {
                      backgroundColor: seedPhraseVisible
                        ? colors.button.dangerHover
                        : colors.card.border,
                    },
                  }}
                >
                  {seedPhraseVisible ? t('actions.hide', 'Hide') : t('actions.reveal', 'Reveal')}
                </ActionButton>
              </ActionRow>
              {seedPhraseVisible && (
                <Box
                  sx={{ marginTop: `${spacing.md}px` }}
                  data-testid="backup-seed-clipboard-warning"
                >
                  <WarningNotice tone="warning" title={t('settings.clipboard_warning_title')}>
                    {t('settings.clipboard_warning_description')}
                  </WarningNotice>
                </Box>
              )}
              {copyFailed && (
                <Box sx={{ marginTop: `${spacing.md}px` }} data-testid="backup-seed-copy-error">
                  <WarningNotice tone="error" title={t('settings.copy_failed')} />
                </Box>
              )}
            </Box>
          </>
        )}
      </PageContent>

      <ConfirmDialog
        visible={reauthOpen}
        onClose={() => setReauthOpen(false)}
        title={t('settings.reveal_phrase_title')}
        message={t('settings.reveal_phrase_message')}
        confirmText={t('actions.reveal', 'Reveal')}
        requirePassword
        validatePassword={actions.checkPassword}
        onConfirm={handleReauthenticated}
        confirmTestID="backup-reauth-confirm"
      />
    </SettingsPanelContent>
  );
}
