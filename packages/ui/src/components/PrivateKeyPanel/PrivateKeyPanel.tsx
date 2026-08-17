/**
 * PrivateKeyPanel - Private key reveal page
 *
 * Two-step flow:
 * 1. Network selection (skipped if single network)
 * 2. Private key display with click-to-reveal and copy functionality
 *
 * Follows BackupPanel patterns for styled components and reveal overlay.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import {
  CaretRightIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeIcon,
  KeyIcon,
  WarningIcon,
  iconSize,
} from '../../icons';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  useAccountsContext,
  getShortAddress,
  type AccountKeyInfo,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  componentSizes,
  duration,
  durationMs,
} from '@salmon/shared';
import {
  buildNetworkListFromAccount,
  getAccountKeysForNetwork,
} from '@salmon/shared/utils/account';
import { ConfirmDialog } from '../ConfirmDialog';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { WarningNotice } from '../WarningNotice';
import type { PrivateKeyPanelProps } from './types';

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

const PrivateKeyCard = styled(Paper)({
  backgroundColor: colors.background.card,
  padding: spacing.lg,
  borderRadius: borderRadius.lg,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
  position: 'relative',
});

const KeyText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
  fontFamily: fontFamily.mono,
  wordBreak: 'break-all',
  lineHeight: lineHeight.relaxed,
  minHeight: componentSizes.backButtonSize,
});

const PathLabel = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: colors.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.wider,
  marginBottom: spacing.sm,
});

const PathValue = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
  fontFamily: fontFamily.mono,
});

const AddressValue = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.secondary,
  marginTop: spacing.xxs,
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
  gap: spacing.xxs,
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

const NetworkListItemButton = styled(ListItemButton)({
  padding: `${spacing.md}px ${spacing.lg}px`,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

const NetworkListItemIcon = styled(ListItemIcon)({
  minWidth: componentSizes.backButtonSize,
  color: colors.text.secondary,
});

const NetworkListItemText = styled(ListItemText)({
  '& .MuiListItemText-primary': {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  '& .MuiListItemText-secondary': {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
});

const ChevronIcon = styled(CaretRightIcon)({
  color: colors.text.secondary,
  width: iconSize.md,
  height: iconSize.md,
});

// ============================================================================
// Component
// ============================================================================

export function PrivateKeyPanel({ onBack }: PrivateKeyPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [state, actions] = useAccountsContext();
  const { activeAccount } = state;

  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copyFailedIndex, setCopyFailedIndex] = useState<number | null>(null);
  // Which key the password dialog is currently standing in front of.
  const [reauthIndex, setReauthIndex] = useState<number | null>(null);

  // Build network list from the active account
  const networks = useMemo(() => buildNetworkListFromAccount(activeAccount), [activeAccount]);

  // Auto-select if only one network
  const effectiveNetworkId = networks.length === 1 ? networks[0].id : selectedNetworkId;

  // Get accounts for the selected network
  const accountKeys: AccountKeyInfo[] = useMemo(
    () => getAccountKeysForNetwork(activeAccount, effectiveNetworkId),
    [effectiveNetworkId, activeAccount]
  );

  const handleSelectNetwork = useCallback((networkId: string) => {
    setSelectedNetworkId(networkId);
    setRevealedIndexes(new Set());
    setCopiedIndex(null);
    setCopyFailedIndex(null);
    setReauthIndex(null);
  }, []);

  // An unlocked session is not proof of identity — it only proves the laptop
  // was left open. The password is asked again before a private key, which is
  // full spending control of the account and one click away from a clipboard,
  // comes into view.
  const handleReveal = useCallback((index: number) => {
    setReauthIndex(index);
  }, []);

  const handleReauthenticated = useCallback(async () => {
    setRevealedIndexes((prev) => {
      if (reauthIndex === null) return prev;
      const next = new Set(prev);
      next.add(reauthIndex);
      return next;
    });
  }, [reauthIndex]);

  const handleHide = useCallback((index: number) => {
    setRevealedIndexes((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const handleCopy = useCallback(
    async (privateKey: string, index: number) => {
      if (!revealedIndexes.has(index)) return;

      try {
        await navigator.clipboard.writeText(privateKey);
        setCopyFailedIndex(null);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), durationMs.feedbackLong);
      } catch {
        // Surface the failure — a silent no-op looks like a successful copy.
        setCopyFailedIndex(index);
      }
    },
    [revealedIndexes]
  );

  const handleBackToNetworks = useCallback(() => {
    setSelectedNetworkId(null);
    setRevealedIndexes(new Set());
    setCopiedIndex(null);
    setCopyFailedIndex(null);
    setReauthIndex(null);
  }, []);

  // ========================================================================
  // Step 1: Network Selection
  // ========================================================================

  if (!effectiveNetworkId) {
    return (
      <SettingsPanelContent title={t('settings.select_network')} onBack={onBack}>
        <PageContent>
          <Typography variant="body2" sx={{ color: colors.text.secondary, mb: `${spacing.sm}px` }}>
            {t('settings.select_network_description')}
          </Typography>
          <List disablePadding>
            {networks.map((network) => (
              <ListItem key={network.id} disablePadding>
                <NetworkListItemButton
                  onClick={() => handleSelectNetwork(network.id)}
                  data-testid={`private-key-network-option-${network.id}`}
                >
                  <NetworkListItemIcon>
                    <GlobeIcon />
                  </NetworkListItemIcon>
                  <NetworkListItemText
                    primary={network.name}
                    secondary={
                      network.blockchain.charAt(0).toUpperCase() + network.blockchain.slice(1)
                    }
                  />
                  <ChevronIcon />
                </NetworkListItemButton>
              </ListItem>
            ))}
          </List>
        </PageContent>
      </SettingsPanelContent>
    );
  }

  // ========================================================================
  // Step 2: Private Key Display
  // ========================================================================

  return (
    <SettingsPanelContent
      title={t('settings.private_key', 'Private Key')}
      onBack={networks.length > 1 ? handleBackToNetworks : onBack}
    >
      <PageContent>
        <WarningAlert severity="warning" icon={<WarningIcon />}>
          <Typography variant="body2" sx={{ fontWeight: fontWeight.medium }}>
            {t('settings.private_key_warning')}
          </Typography>
        </WarningAlert>

        {accountKeys.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ color: colors.text.secondary, textAlign: 'center', py: `${spacing['3xl']}px` }}
          >
            {t('settings.no_accounts_for_network')}
          </Typography>
        ) : (
          accountKeys.map((accountKey, index) => {
            const isRevealed = revealedIndexes.has(index);
            const isCopied = copiedIndex === index;

            return (
              <Box key={index}>
                <PathLabel>{t('settings.derivation_path')}</PathLabel>
                <PathValue>{accountKey.path}</PathValue>
                <AddressValue>{getShortAddress(accountKey.address, 8)}</AddressValue>

                <PrivateKeyCard
                  sx={{ mt: `${spacing.sm}px` }}
                  data-testid={`private-key-card-${index}`}
                >
                  <KeyText>
                    {isRevealed ? accountKey.privateKey : accountKey.privateKey.replace(/./g, '*')}
                  </KeyText>

                  {!isRevealed && (
                    <BlurOverlay
                      onClick={() => handleReveal(index)}
                      data-testid={`private-key-reveal-overlay-${index}`}
                    >
                      <KeyIcon size={fontSize.iconLg} color={colors.text.secondary} />
                      <RevealText>{t('settings.tap_to_reveal', 'Tap to reveal')}</RevealText>
                    </BlurOverlay>
                  )}
                </PrivateKeyCard>

                {isRevealed && (
                  <Box
                    sx={{ marginTop: `${spacing.md}px` }}
                    data-testid={`private-key-clipboard-warning-${index}`}
                  >
                    <WarningNotice tone="warning" title={t('settings.clipboard_warning_title')}>
                      {t('settings.clipboard_key_warning_description')}
                    </WarningNotice>
                  </Box>
                )}

                <ActionRow>
                  <Tooltip title={isCopied ? t('wallet.copied', 'Copied!') : ''} open={isCopied}>
                    <CopyButton
                      variant="outlined"
                      startIcon={
                        isCopied ? <CheckIcon color={colors.status.success} /> : <CopyIcon />
                      }
                      onClick={() => handleCopy(accountKey.privateKey, index)}
                      disabled={!isRevealed}
                      data-testid={`private-key-copy-button-${index}`}
                    >
                      {isCopied ? t('wallet.copied', 'Copied!') : t('actions.copy', 'Copy')}
                    </CopyButton>
                  </Tooltip>
                  <ActionButton
                    variant="outlined"
                    startIcon={isRevealed ? <EyeSlashIcon /> : <EyeIcon />}
                    onClick={() => (isRevealed ? handleHide(index) : handleReveal(index))}
                    data-testid={`private-key-reveal-button-${index}`}
                    sx={{
                      backgroundColor: isRevealed ? colors.accent.primary : colors.background.card,
                      color: isRevealed ? colors.text.primary : colors.text.primary,
                      border: `${borderWidth.thin}px solid ${
                        isRevealed ? colors.accent.primary : colors.border.default
                      }`,
                      '&:hover': {
                        backgroundColor: isRevealed
                          ? colors.button.dangerHover
                          : colors.card.border,
                      },
                    }}
                  >
                    {isRevealed ? t('actions.hide', 'Hide') : t('actions.reveal', 'Reveal')}
                  </ActionButton>
                </ActionRow>
                {copyFailedIndex === index && (
                  <Typography
                    data-testid={`private-key-copy-error-${index}`}
                    sx={{
                      color: colors.status.error,
                      fontSize: fontSize.sm,
                      fontWeight: fontWeight.medium,
                      marginTop: `${spacing.sm}px`,
                    }}
                  >
                    {t('settings.copy_failed')}
                  </Typography>
                )}
              </Box>
            );
          })
        )}
      </PageContent>

      <ConfirmDialog
        visible={reauthIndex !== null}
        onClose={() => setReauthIndex(null)}
        title={t('settings.reveal_private_key_title')}
        message={t('settings.reveal_private_key_message')}
        confirmText={t('actions.reveal', 'Reveal')}
        requirePassword
        validatePassword={actions.checkPassword}
        onConfirm={handleReauthenticated}
        confirmTestID="private-key-reauth-confirm"
      />
    </SettingsPanelContent>
  );
}
