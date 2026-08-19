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
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import { GlobeIcon, TrashIcon, iconSize } from '../../icons';
import { useTranslation } from 'react-i18next';
import {
  colors,
  semantic,
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

// The row itself does nothing — the revoke button beside it is the only
// control. It used to be a `ListItemButton` with no `onClick`, which is a
// focusable `role="button"` that a keyboard user lands on and cannot act on,
// so it is inert markup now (DESIGN.md §"The settings surface joined the
// system"). The hover tint went with it: a highlight on a row that cannot be
// pressed promises an action that is not there.
const AppRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: `${spacing.sm}px ${spacing.lg}px`,
  minWidth: 0,
});

const RevokeButton = styled(IconButton)({
  color: semantic.status.danger,
  '&:hover': {
    backgroundColor: semantic.status.dangerTint,
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
  fontSize: fontSize.body,
  textAlign: 'center',
});

const EmptySubtext = styled(Typography)({
  color: colors.text.disabled,
  fontSize: fontSize.caption,
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
              <AppRow data-testid={`trusted-apps-item-${app.domain}`}>
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
                      fontSize: fontSize.body,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                  secondaryTypographyProps={{
                    sx: {
                      color: colors.text.secondary,
                      fontSize: fontSize.caption,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                />
              </AppRow>
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
