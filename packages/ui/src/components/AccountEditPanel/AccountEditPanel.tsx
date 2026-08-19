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
import { CaretRightIcon, KeyIcon, LockIcon, TextTIcon, UserIcon } from '../../icons';
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
  // The control radius, by its scale name (DESIGN.md §The Control Radius Rule);
  // `borderRadius.lg` is the deprecated alias for the same 12.
  borderRadius: borderRadius.r3,
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
  borderRadius: borderRadius.r2,
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

/**
 * The profile avatar tracks the column it sits in and stops at its token
 * ceiling. The extension is a resizable narrow column, so a fixed size would
 * either crowd the narrow end or look stranded at the wide one; the ceiling
 * is the token and the growth is the surface's own.
 */
const AVATAR_SIZE = `min(45vw, ${componentSizes.avatarProfileMax}px)`;
/**
 * The initials are a proportion of the box that holds them, not a step on the
 * type scale: they are the avatar's content rather than the screen's copy, so
 * they must stay centred in the circle at every width it takes.
 */
const AVATAR_INITIALS_RATIO = 0.31;
const AVATAR_INITIALS_SIZE = `calc(${AVATAR_SIZE} * ${AVATAR_INITIALS_RATIO})`;

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
      icon: <TextTIcon color={colors.text.primary} />,
      onPress: () => onEditName(accountId),
      testId: 'account-edit-name',
    },
    {
      labelKey: 'settings.account_edit.avatar_section',
      icon: <UserIcon color={colors.text.primary} />,
      onPress: onEditAvatar,
      testId: 'account-edit-avatar',
    },
    {
      labelKey: 'settings.account_edit.backup_section',
      icon: <KeyIcon color={colors.text.primary} />,
      onPress: onBackupSeed,
      testId: 'account-edit-backup',
    },
    {
      labelKey: 'settings.account_edit.private_key_section',
      icon: <LockIcon color={colors.text.primary} />,
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
              sx={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
              imgProps={{ alt: '', onError: () => setImgError(true) }}
            />
          ) : (
            <Avatar
              sx={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                backgroundColor: avatarColor,
                fontSize: AVATAR_INITIALS_SIZE,
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
              fontSize: fontSize.heading,
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
                  fontSize: fontSize.body,
                }}
              >
                {t(item.labelKey)}
              </Typography>
              <CaretRightIcon color={colors.text.secondary} />
            </Row>
            {index < sections.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </SectionContainer>
    </SettingsPanelContent>
  );
}
