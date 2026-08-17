/**
 * TrustedAppsSelector - Connected dApps management component for browser extension
 *
 * Displays a list of trusted/connected dApps for the current network
 * and allows the user to revoke their access.
 */

import React, { useCallback, useState } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import { GlobeIcon, TrashIcon, iconSize } from '../../icons';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  type TrustedAppItem,
  fontSize,
  fontWeight,
  componentSizes,
} from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import type { TrustedAppsSelectorProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const StyledList = styled(List)({
  padding: `${spacing.sm}px 0`,
});

const StyledListItemButton = styled(ListItemButton)({
  padding: `${spacing.sm}px ${spacing.lg}px`,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

const RevokeButton = styled(IconButton)({
  color: colors.status.error,
  '&:hover': {
    backgroundColor: colors.status.errorBackground,
  },
});

const AppAvatar = styled(Avatar)({
  width: componentSizes.iconSizeXL,
  height: componentSizes.iconSizeXL,
  backgroundColor: colors.card.border,
});

const EmptyContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing['3xl']}px ${spacing.lg}px`,
  gap: spacing.sm,
});

const EmptyText = styled(Typography)({
  color: colors.text.secondary,
  fontSize: fontSize.base,
  textAlign: 'center',
});

const EmptySubtext = styled(Typography)({
  color: colors.text.disabled,
  fontSize: fontSize.sm,
  textAlign: 'center',
});

// ============================================================================
// Component
// ============================================================================

export function TrustedAppsSelector({
  apps,
  onRevokeApp,
  onBack,
}: TrustedAppsSelectorProps): React.ReactElement {
  const { t } = useTranslation();
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = useCallback(
    async (domain: string) => {
      setRevoking(domain);
      try {
        await onRevokeApp(domain);
      } finally {
        setRevoking(null);
      }
    },
    [onRevokeApp]
  );

  return (
    <SettingsPanelContent title={t('settings.trusted_apps', 'Trusted Apps')} onBack={onBack}>
      {apps.length > 0 ? (
        <StyledList>
          {apps.map((app: TrustedAppItem) => (
            <ListItem
              key={app.domain}
              disablePadding
              secondaryAction={
                <RevokeButton
                  edge="end"
                  onClick={() => handleRevoke(app.domain)}
                  disabled={revoking === app.domain}
                  size="small"
                  aria-label={t('settings.trusted_apps_revoke', 'Revoke')}
                  data-testid={`trusted-apps-revoke-${app.domain}`}
                >
                  <TrashIcon size={iconSize.md} />
                </RevokeButton>
              }
            >
              <StyledListItemButton disableRipple data-testid={`trusted-apps-item-${app.domain}`}>
                <ListItemAvatar>
                  {app.icon ? (
                    <AppAvatar src={app.icon} alt={app.name || app.domain} />
                  ) : (
                    <AppAvatar>
                      <GlobeIcon size={iconSize.md} color={colors.text.secondary} />
                    </AppAvatar>
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={app.name || app.domain}
                  secondary={app.name ? app.domain : undefined}
                  primaryTypographyProps={{
                    sx: {
                      color: colors.text.primary,
                      fontWeight: fontWeight.medium,
                      fontSize: fontSize.base,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                  secondaryTypographyProps={{
                    sx: {
                      color: colors.text.secondary,
                      fontSize: fontSize.sm,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                />
              </StyledListItemButton>
            </ListItem>
          ))}
        </StyledList>
      ) : (
        <EmptyContainer>
          <EmptyText>{t('settings.no_trusted_apps', 'No connected apps')}</EmptyText>
          <EmptySubtext>
            {t('settings.no_trusted_apps_hint', 'Apps you connect to will appear here')}
          </EmptySubtext>
        </EmptyContainer>
      )}
    </SettingsPanelContent>
  );
}
