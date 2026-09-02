/**
 * TrustedAppsSelector — connected dApps, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/TrustedAppsSelector`: a
 * `ListRow` per connected dApp — its icon or a `GlobeIcon` fallback leading,
 * name and domain stacked, a revoke trash trailing. The empty state is a
 * heading and a line of copy, not a warning: nothing here failed.
 */
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { spacing, type TrustedAppItem } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { GlobeIcon, TrashIcon, iconSize } from '../../icons';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { SettingsPanelContent } from '../SettingsPanelContent';
import type { TrustedAppsSelectorProps } from './types';

/** The leading well every app row carries — Settings' own row bubble size. */
const ROW_BUBBLE_SIZE = 40;

export function TrustedAppsSelector({
  apps,
  onRevokeApp,
  onBack,
}: TrustedAppsSelectorProps): React.ReactElement {
  const { t } = useTranslation();
  const { text, status } = useSemantic();
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

  const renderAppRow = useCallback(
    (app: TrustedAppItem) => (
      <ListRow
        key={app.domain}
        testID={`trusted-apps-item-${app.domain}`}
        leading={
          <IconBubble size={ROW_BUBBLE_SIZE} shape="circle" tone="surface">
            {app.icon ? (
              <img
                src={app.icon}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: ROW_BUBBLE_SIZE / 2,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <GlobeIcon size={iconSize.md} color={text.secondary} />
            )}
          </IconBubble>
        }
        title={app.name || app.domain}
        subtitle={app.name ? app.domain : undefined}
        trailing={
          <IconBubble
            testID={`trusted-apps-revoke-${app.domain}`}
            size={ROW_BUBBLE_SIZE}
            tone="ghost"
            icon={TrashIcon}
            iconSize={iconSize.sm}
            iconColor={status.danger}
            onPress={() => void handleRevoke(app.domain)}
            disabled={revoking === app.domain}
            accessibilityLabel={t('settings.trusted_apps_revoke', 'Revoke')}
          />
        }
      />
    ),
    [handleRevoke, revoking, t, text.secondary, status.danger]
  );

  return (
    <SettingsPanelContent
      title={t('settings.trusted_apps', 'Trusted Apps')}
      subtitle={t('settings.trusted_apps_subtitle', "Apps you've connected to your wallet.")}
      onBack={onBack}
    >
      {apps.length > 0 ? (
        apps.map(renderAppRow)
      ) : (
        <div
          data-testid="trusted-apps-empty"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing['2xl']}px 0`,
            textAlign: 'center',
          }}
        >
          <SectionLabel variant="title">
            {t('settings.no_trusted_apps', 'No connected apps')}
          </SectionLabel>
          <SectionLabel variant="group" style={{ color: text.tertiary }}>
            {t('settings.no_trusted_apps_hint', 'Apps you connect to will appear here')}
          </SectionLabel>
        </div>
      )}
    </SettingsPanelContent>
  );
}
