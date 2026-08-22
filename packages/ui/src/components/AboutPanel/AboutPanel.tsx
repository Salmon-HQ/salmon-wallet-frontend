/**
 * AboutPanel - About information panel
 *
 * Displays information about the Salmon Wallet:
 * - App version
 * - Links to website
 * - Terms of service and privacy policy links
 * - Social media links
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
import Divider from '@mui/material/Divider';
import {
  ArrowSquareOutIcon,
  BookOpenIcon,
  FileTextIcon,
  GithubLogoIcon,
  GlobeIcon,
  ShieldCheckIcon,
  XLogoIcon,
  iconSize,
} from '../../icons';
import { useTranslation } from 'react-i18next';
import {
  APP_VERSION,
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  letterSpacing,
  opacity,
  componentSizes,
  tabularNums,
} from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import type { AboutPanelProps } from './types';
import { BrandMark } from '../BrandMark';

interface LinkItem {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  url: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * External links configuration
 */
const GENERAL_LINKS: LinkItem[] = [
  {
    id: 'website',
    labelKey: 'settings.about_website',
    icon: <GlobeIcon />,
    url: 'https://www.salmonwallet.io',
  },
];

const LEGAL_LINKS: LinkItem[] = [
  {
    id: 'terms',
    labelKey: 'settings.about_terms',
    icon: <FileTextIcon />,
    url: 'https://www.salmonwallet.io/terms',
  },
  {
    id: 'privacy',
    labelKey: 'settings.about_privacy',
    icon: <ShieldCheckIcon />,
    url: 'https://www.salmonwallet.io/privacy',
  },
];

const SOCIAL_LINKS: LinkItem[] = [
  {
    id: 'twitter',
    labelKey: 'X (Twitter)',
    icon: <XLogoIcon />,
    url: 'https://x.com/salmonwallet',
  },
  {
    id: 'github',
    labelKey: 'GitHub',
    icon: <GithubLogoIcon />,
    url: 'https://github.com/salmon-wallet',
  },
  {
    id: 'medium',
    labelKey: 'Medium',
    icon: <BookOpenIcon />,
    url: 'https://medium.com/@salmonwallet',
  },
];

// ============================================================================
// Styled Components
// ============================================================================

const LogoSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: `${spacing.xl}px ${spacing.lg}px`,
  gap: spacing.md,
});

const LogoContainer = styled(Box)({
  width: componentSizes.logoSizeSmall,
  height: componentSizes.logoSizeSmall,
  borderRadius: borderRadius.xl,
  backgroundColor: colors.background.card,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: spacing.md,
});

const AppName = styled(Typography)({
  fontSize: fontSize.title,
  fontWeight: fontWeight.bold,
  color: colors.text.primary,
});

const VersionText = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.caption,
  color: colors.text.secondary,
});

const SectionTitle = styled(Typography)({
  fontSize: fontSize.label,
  fontWeight: fontWeight.semibold,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.label,
  color: colors.text.secondary,
  padding: `${spacing.md}px ${spacing.lg}px ${spacing.sm}px`,
  marginTop: spacing.sm,
});

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
  color: colors.text.secondary,
});

const ExternalIcon = styled(ArrowSquareOutIcon)({
  color: colors.text.secondary,
  width: iconSize.sm,
  height: iconSize.sm,
});

const StyledDivider = styled(Divider)({
  backgroundColor: colors.border.default,
  margin: `${spacing.sm}px ${spacing.lg}px`,
});

const FooterText = styled(Typography)({
  fontSize: fontSize.caption,
  color: colors.text.secondary,
  textAlign: 'center',
  padding: `${spacing.lg}px`,
  opacity: opacity.low,
});

// ============================================================================
// Component
// ============================================================================

export function AboutPanel({ onBack }: AboutPanelProps): React.ReactElement {
  const { t } = useTranslation();

  const handleLinkClick = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const renderLinkItem = useCallback(
    (link: LinkItem) => (
      <ListItem key={link.id} disablePadding>
        {/* Every row here opens an external destination in a new tab, so it
            announces as a link rather than a button (DESIGN.md §"The settings
            surface joined the system"). */}
        <StyledListItemButton
          role="link"
          onClick={() => handleLinkClick(link.url)}
          data-testid={`about-link-${link.id}`}
        >
          <StyledListItemIcon>{link.icon}</StyledListItemIcon>
          <ListItemText
            primary={
              link.labelKey.startsWith('settings.')
                ? t(link.labelKey, link.labelKey.replace('settings.about_', ''))
                : link.labelKey
            }
            primaryTypographyProps={{
              sx: {
                color: colors.text.primary,
                fontSize: fontSize.body,
                fontWeight: fontWeight.medium,
              },
            }}
          />
          <ExternalIcon />
        </StyledListItemButton>
      </ListItem>
    ),
    [t, handleLinkClick]
  );

  return (
    <SettingsPanelContent title={t('settings.about', 'About')} onBack={onBack}>
      <LogoSection>
        <LogoContainer>
          <BrandMark size={componentSizes.iconSize3XL} title="Salmon Wallet" />
        </LogoContainer>
        <AppName>Salmon Wallet</AppName>
        <VersionText>{t('settings.app_version', { version: APP_VERSION })}</VersionText>
      </LogoSection>

      <StyledDivider />

      <SectionTitle>{t('settings.about_general', 'General')}</SectionTitle>
      <StyledList>{GENERAL_LINKS.map(renderLinkItem)}</StyledList>

      <StyledDivider />

      <SectionTitle>{t('settings.about_legal', 'Legal')}</SectionTitle>
      <StyledList>{LEGAL_LINKS.map(renderLinkItem)}</StyledList>

      <StyledDivider />

      <SectionTitle>{t('settings.about_social', 'Follow Us')}</SectionTitle>
      <StyledList>{SOCIAL_LINKS.map(renderLinkItem)}</StyledList>

      <FooterText>
        {t('settings.about_made_with_love', 'Made with love by the Salmon team')}
      </FooterText>
    </SettingsPanelContent>
  );
}
