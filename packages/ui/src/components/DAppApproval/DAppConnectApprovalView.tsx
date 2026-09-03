import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatOrigin, getShortAddress, spacing } from '@salmon/shared';

import { GlobeIcon, WalletIcon } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton, SecondaryButton } from '../Button';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { OnboardingDescription, OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { WarningNotice } from '../WarningNotice';
import { AppIdentity } from './AppIdentity';
import { CardHead, bodyText, cardColumn } from './common';
import type { DAppConnectApprovalViewProps } from './types';

export function DAppConnectApprovalView({
  origin,
  appName,
  appIcon,
  address,
  disabled = false,
  loading = false,
  showOriginWarning = false,
  onApprove,
  onReject,
}: DAppConnectApprovalViewProps): React.ReactElement {
  const { t } = useTranslation();
  const tokens = useSemantic();
  const displayOrigin = formatOrigin(origin);
  const shortAddress = address ? (getShortAddress(address, 4) ?? '') : '';

  return (
    <OnboardingLayout
      testID="dapp-connect-approval"
      variant="content"
      backgroundColor={tokens.surface.bedrock}
      markColor={tokens.accent.fill}
      scrollBody
      title={
        <OnboardingTitle testID="approval-title">
          {t('dapp.connect_title', 'Connect to dApp')}
        </OnboardingTitle>
      }
      description={
        <OnboardingDescription>
          {t('dapp.connect_subtitle', 'This site wants to connect to your Salmon Wallet')}
        </OnboardingDescription>
      }
      body={
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          <Card padding="lg" gap={spacing.md} style={cardColumn}>
            <CardHead icon={GlobeIcon} label={t('dapp.requesting_site', 'Requesting site')} />
            <AppIdentity appName={appName} appIcon={appIcon} displayOrigin={displayOrigin} />
            <p style={bodyText(tokens)}>
              {t(
                'dapp.connect_permissions_hint',
                'The site will be able to view your public address and request signatures.'
              )}
            </p>
          </Card>

          <Card padding="lg" gap={spacing.md} style={cardColumn}>
            <CardHead icon={WalletIcon} label={t('dapp.wallet_address', 'Wallet')} />
            <KeyValueRow
              layout="stacked"
              label={shortAddress || t('dapp.current_wallet', 'Current wallet')}
              value={address ?? ''}
              valueFont="mono"
            />
            {showOriginWarning && (
              <WarningNotice
                tone="warning"
                title={t('dapp.insecure_origin_warning', 'This origin does not use HTTPS.')}
              />
            )}
          </Card>
        </div>
      }
      secondary={
        <SecondaryButton onPress={onReject} disabled={loading} fullWidth>
          {t('dapp.deny', 'Deny').toUpperCase()}
        </SecondaryButton>
      }
      action={
        <PrimaryButton
          onPress={onApprove}
          loading={loading}
          disabled={disabled || loading}
          fullWidth
        >
          {t('dapp.approve', 'Approve').toUpperCase()}
        </PrimaryButton>
      }
    />
  );
}
