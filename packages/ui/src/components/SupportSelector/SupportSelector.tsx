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
import {
  ArrowSquareOutIcon,
  EnvelopeIcon,
  FileTextIcon,
  QuestionIcon,
  ShieldIcon,
  XLogoIcon,
  iconSize,
} from '../../icons';
import { useTranslation } from 'react-i18next';
import {
  colors,
  semantic,
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
  faq: <QuestionIcon />,
  docs: <FileTextIcon />,
  twitter: <XLogoIcon />,
  email: <EnvelopeIcon />,
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

const ExternalIcon = styled(ArrowSquareOutIcon)({
  color: colors.text.secondary,
  width: iconSize.sm,
  height: iconSize.sm,
});

const SecurityNotice = styled(Box)({
  display: 'flex',
  alignItems: 'flex-start',
  gap: spacing.sm,
  backgroundColor: semantic.status.warningTint,
  borderRadius: borderRadius.md,
  padding: spacing.md,
  margin: `${spacing.lg}px ${spacing.lg}px`,
});

const SecurityIcon = styled(ShieldIcon)({
  color: semantic.status.warning,
  width: iconSize.md,
  height: iconSize.md,
  marginTop: spacing.xxs,
});

const SecurityText = styled(Typography)({
  fontSize: fontSize.caption,
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
        {/* Every row leaves the app for an external URL (docs, social, mailto),
            so each one announces as a link, not a button — the same reading the
            mobile surface gives them (DESIGN.md §"The settings surface joined
            the system"). */}
        <StyledListItemButton role="link" onClick={() => onOpenLink(option.url)}>
          <StyledListItemIcon>{ICON_MAP[option.id] || <QuestionIcon />}</StyledListItemIcon>
          <ListItemText
            primary={t(option.title)}
            secondary={t(option.description)}
            primaryTypographyProps={{
              sx: {
                color: colors.text.primary,
                fontSize: fontSize.body,
                fontWeight: fontWeight.medium,
              },
            }}
            secondaryTypographyProps={{
              sx: {
                color: colors.text.secondary,
                fontSize: fontSize.caption,
              },
            }}
          />
          <ExternalIcon />
        </StyledListItemButton>
      </ListItem>
    ),
    [onOpenLink, t]
  );

  return (
    <SettingsPanelContent title={t('settings.help_support')} onBack={onBack}>
      <StyledList>{options.map(renderOption)}</StyledList>

      <SecurityNotice>
        <SecurityIcon />
        <SecurityText>{t('settings.security_notice')}</SecurityText>
      </SecurityNotice>
    </SettingsPanelContent>
  );
}
