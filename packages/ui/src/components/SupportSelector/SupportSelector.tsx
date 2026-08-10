/**
 * SupportSelector - Help & Support component for browser extension
 *
 * Displays a list of support options (FAQ, docs, social, email)
 * with a security notice about seed phrase protection.
 */

import React, { useCallback } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import TwitterIcon from '@mui/icons-material/Twitter';
import ForumIcon from '@mui/icons-material/Forum';
import EmailIcon from '@mui/icons-material/Email';
import ShieldIcon from '@mui/icons-material/Shield';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  borderRadius,
  type SupportOptionItem,
  fontSize,
  fontWeight,
  lineHeight,
  componentSizes,
} from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import type { SupportSelectorProps } from './types';

// ============================================================================
// Icon mapping
// ============================================================================

const ICON_MAP: Record<string, React.ReactNode> = {
  faq: <HelpOutlineIcon />,
  docs: <DescriptionIcon />,
  twitter: <TwitterIcon />,
  discord: <ForumIcon />,
  email: <EmailIcon />,
};

// ============================================================================
// Styled Components
// ============================================================================

const StyledList = styled(List)({
  padding: 0,
});

const StyledListItemButton = styled(ListItemButton)({
  padding: `${spacing.md}px ${spacing.lg}px`,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

const StyledListItemIcon = styled(ListItemIcon)({
  minWidth: componentSizes.backButtonSize,
  color: colors.accent.primary,
});

const ExternalIcon = styled(OpenInNewIcon)({
  color: colors.text.secondary,
  fontSize: fontSize.md,
});

const SecurityNotice = styled(Box)({
  display: 'flex',
  alignItems: 'flex-start',
  gap: spacing.sm,
  backgroundColor: colors.status.warningBackground,
  borderRadius: borderRadius.md,
  padding: spacing.md,
  margin: `${spacing.lg}px ${spacing.lg}px`,
});

const SecurityIcon = styled(ShieldIcon)({
  color: colors.status.warning,
  fontSize: fontSize.xl,
  marginTop: spacing.xxs,
});

const SecurityText = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.secondary,
  lineHeight: lineHeight.tokenListItem,
  flex: 1,
});

// ============================================================================
// Component
// ============================================================================

export function SupportSelector({
  options,
  onOpenLink,
  onBack,
}: SupportSelectorProps): React.ReactElement {
  const { t } = useTranslation();

  const renderOption = useCallback(
    (option: SupportOptionItem) => (
      <ListItem key={option.id} disablePadding>
        <StyledListItemButton onClick={() => onOpenLink(option.url)}>
          <StyledListItemIcon>
            {ICON_MAP[option.id] || <HelpOutlineIcon />}
          </StyledListItemIcon>
          <ListItemText
            primary={option.title}
            secondary={option.description}
            primaryTypographyProps={{
              sx: {
                color: colors.text.primary,
                fontSize: fontSize.base,
                fontWeight: fontWeight.medium,
              },
            }}
            secondaryTypographyProps={{
              sx: {
                color: colors.text.secondary,
                fontSize: fontSize.sm,
              },
            }}
          />
          <ExternalIcon />
        </StyledListItemButton>
      </ListItem>
    ),
    [onOpenLink]
  );

  return (
    <SettingsPanelContent
      title={t('settings.help_support', 'Help & Support')}
      onBack={onBack}
    >
      <StyledList>{options.map(renderOption)}</StyledList>

      <SecurityNotice>
        <SecurityIcon />
        <SecurityText>
          {t(
            'settings.security_notice',
            'Salmon Wallet team will never ask for your seed phrase or private keys. Never share this information with anyone.'
          )}
        </SecurityText>
      </SecurityNotice>
    </SettingsPanelContent>
  );
}
