/**
 * AccountEditPanel - Account editing options
 *
 * Settings-style list with sections for name, avatar, backup seed, and export key.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import ListItemButton from '@mui/material/ListItemButton';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import PersonIcon from '@mui/icons-material/Person';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LockIcon from '@mui/icons-material/Lock';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { styled } from '../../utils/styled';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  useAccountsContext,
  getAvatarColor,
  getInitials,
  type Account,
  componentSizes,
} from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import type { AccountEditPanelProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const SectionContainer = styled(Box)({
  backgroundColor: colors.interactive.surface,
  borderRadius: borderRadius.lg,
  overflow: 'hidden',
});

const Row = styled(ListItemButton)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
  padding: `${spacing.lg}px`,
});

const IconContainer = styled(Box)({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: borderRadius.md,
  backgroundColor: colors.interactive.hoverSubtle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const Divider = styled(Box)({
  height: componentSizes.dividerHeight,
  backgroundColor: colors.border.default,
  marginLeft: spacing.lg,
  marginRight: spacing.lg,
});

// ============================================================================
// Component
// ============================================================================

export function AccountEditPanel({
  accountId,
  onEditName,
  onEditAvatar,
  onBackupSeed,
  onExportPrivateKey,
  onBack,
}: AccountEditPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [accountState] = useAccountsContext();
  const account =
    accountState.accounts.find((a: Account) => a.id === accountId) || accountState.activeAccount;
  const [imgError, setImgError] = useState(false);
  const avatarColor = useMemo(() => getAvatarColor(account?.id || ''), [account?.id]);
  const initials = useMemo(() => getInitials(account?.name || ''), [account?.name]);

  const sections = [
    {
      labelKey: 'settings.account_edit.name_section',
      icon: <TextFieldsIcon sx={{ color: colors.text.primary }} />,
      onPress: () => onEditName(accountId),
      testId: 'account-edit-name',
    },
    {
      labelKey: 'settings.account_edit.avatar_section',
      icon: <PersonIcon sx={{ color: colors.text.primary }} />,
      onPress: onEditAvatar,
      testId: 'account-edit-avatar',
    },
    {
      labelKey: 'settings.account_edit.backup_section',
      icon: <VpnKeyIcon sx={{ color: colors.text.primary }} />,
      onPress: onBackupSeed,
      testId: 'account-edit-backup',
    },
    {
      labelKey: 'settings.account_edit.private_key_section',
      icon: <LockIcon sx={{ color: colors.text.primary }} />,
      onPress: onExportPrivateKey,
      testId: 'account-edit-private-key',
    },
  ];

  return (
    <SettingsPanelContent title={t('settings.account_edit.title')} onBack={onBack}>
      {account && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: spacing.md,
            gap: `${spacing.md}px`,
          }}
        >
          {account.avatar && !imgError ? (
            <Avatar
              src={account.avatar}
              sx={{ width: 'min(45vw, 180px)', height: 'min(45vw, 180px)' }}
              imgProps={{ alt: '', onError: () => setImgError(true) }}
            />
          ) : (
            <Avatar
              sx={{
                width: 'min(45vw, 180px)',
                height: 'min(45vw, 180px)',
                backgroundColor: avatarColor,
                fontSize: 'clamp(2rem, 8vw, 3.5rem)',
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
              }}
            >
              {initials}
            </Avatar>
          )}
          <Typography
            sx={{
              color: colors.text.secondary,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              textAlign: 'center',
            }}
          >
            {account.name}
          </Typography>
        </Box>
      )}

      <SectionContainer>
        {sections.map((item, index) => (
          <React.Fragment key={item.labelKey}>
            <Row onClick={item.onPress} data-testid={item.testId}>
              <IconContainer>{item.icon}</IconContainer>
              <Typography
                sx={{
                  flex: 1,
                  color: colors.text.primary,
                  fontWeight: fontWeight.semibold,
                  fontSize: fontSize.base,
                }}
              >
                {t(item.labelKey)}
              </Typography>
              <ChevronRightIcon sx={{ color: colors.text.secondary }} />
            </Row>
            {index < sections.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </SectionContainer>
    </SettingsPanelContent>
  );
}
