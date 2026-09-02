import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  copyToClipboard,
  formatDateTime,
  formatOrigin,
  getShortAddress,
  spacing,
  useCopyFeedback,
} from '@salmon/shared';

import {
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  PenNibIcon,
  iconSize,
} from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton, SecondaryButton, TextButton } from '../Button';
import { Card } from '../Card';
import { CopyTick } from '../CopyTick';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { OnboardingDescription, OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { WarningNotice } from '../WarningNotice';
import { AppIdentity } from './AppIdentity';
import { CardHead, bodyText, cardColumn, monoText } from './common';
import type { DAppSignInApprovalViewProps } from './types';

function formatTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const ts = Date.parse(value);
  // `Date.parse` yields milliseconds; `formatDateTime` expects Unix seconds.
  return Number.isNaN(ts) ? value : formatDateTime(ts / 1000);
}

/**
 * Approval view for native `solana:signIn` (Sign-In-With-Solana). Unlike the
 * legacy heuristic that parsed dApp-supplied text, every field shown here comes
 * from the WALLET-built SIWS message (`prepareSignInMessage`), whose `domain`
 * is bound to the real requesting origin. `domainMismatch` means the dApp
 * claimed a different domain — signing is refused in that case.
 */
export function DAppSignInApprovalView({
  origin,
  appName,
  appIcon,
  siws,
  messageText,
  domainMismatch,
  requestedDomain,
  isOffchainMessage = false,
  disabled = false,
  loading = false,
  onApprove,
  onReject,
}: DAppSignInApprovalViewProps): React.ReactElement {
  const { t } = useTranslation();
  const tokens = useSemantic();
  const displayOrigin = formatOrigin(origin);

  const [showRaw, setShowRaw] = useState(false);
  const { copied, trigger: showCopied } = useCopyFeedback();

  const issuedAtDisplay = useMemo(() => formatTimestamp(siws?.issuedAt), [siws]);
  const expiresDisplay = useMemo(() => formatTimestamp(siws?.expirationTime), [siws]);

  const handleCopyAccount = () => {
    if (!siws?.address) return;
    void copyToClipboard(siws.address);
    showCopied();
  };

  const canApprove = !disabled && !loading && !domainMismatch && !!siws;

  return (
    <OnboardingLayout
      testID="dapp-sign-in-approval"
      variant="content"
      backgroundColor={tokens.surface.bedrock}
      markColor={tokens.accent.fill}
      scrollBody
      title={
        <OnboardingTitle testID="approval-title">
          {t('dapp.sign_in_title', 'Sign In')}
        </OnboardingTitle>
      }
      description={
        <OnboardingDescription>
          {t(
            'dapp.sign_in_subtitle',
            'This app is requesting you to sign in with your Solana account. This will not submit a transaction.'
          )}
        </OnboardingDescription>
      }
      body={
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          <Card padding="lg" gap={spacing.md} style={cardColumn}>
            <CardHead icon={GlobeIcon} label={t('dapp.requesting_site', 'Requesting site')} />
            <AppIdentity appName={appName} appIcon={appIcon} displayOrigin={displayOrigin} />
            <p style={bodyText(tokens)}>
              {t(
                'dapp.sign_in_hint',
                'Salmon built this sign-in message from the site you are actually visiting, so it cannot impersonate another site.'
              )}
            </p>
          </Card>

          <Card padding="lg" gap={spacing.md} style={cardColumn}>
            <CardHead
              icon={PenNibIcon}
              label={t('dapp.sign_in_message_label', 'Sign-in message')}
            />

            {domainMismatch && (
              <WarningNotice title={t('dapp.siws_domain_mismatch_title', 'Domain mismatch')}>
                {t('dapp.sign_in_domain_mismatch', {
                  defaultValue:
                    'This app asked to sign in for "{{requested}}" but the request came from this site. Salmon has refused to sign it.',
                  requested: requestedDomain ?? '',
                })}
              </WarningNotice>
            )}

            {siws ? (
              <>
                {siws.statement && (
                  <p
                    style={{
                      ...bodyText(tokens),
                      color: tokens.text.primary,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {siws.statement}
                  </p>
                )}

                <KeyValueRow
                  layout="stacked"
                  label={t('dapp.siws_domain', 'Domain')}
                  value={siws.domain}
                  valueFont="mono"
                />

                <KeyValueRow
                  layout="stacked"
                  label={
                    copied ? t('dapp.siws_copied', 'Copied') : t('dapp.siws_account', 'Account')
                  }
                  value={getShortAddress(siws.address)}
                  valueFont="mono"
                  testID="siws-account"
                  action={
                    <IconBubble
                      size={24}
                      tone="ghost"
                      onPress={handleCopyAccount}
                      accessibilityLabel={siws.address}
                    >
                      <CopyTick
                        copied={copied}
                        copy={<CopyIcon size={iconSize.sm} color={tokens.text.secondary} />}
                        tick={<CheckIcon size={iconSize.sm} color={tokens.status.success} />}
                      />
                    </IconBubble>
                  }
                />

                {siws.uri && (
                  <KeyValueRow
                    layout="stacked"
                    label={t('dapp.siws_uri', 'URI')}
                    value={siws.uri}
                    valueFont="mono"
                  />
                )}

                {siws.nonce && (
                  <KeyValueRow
                    layout="stacked"
                    label={t('dapp.siws_nonce', 'Nonce')}
                    value={siws.nonce}
                    valueFont="mono"
                  />
                )}

                {issuedAtDisplay && (
                  <KeyValueRow
                    layout="stacked"
                    label={t('dapp.siws_issued_at', 'Issued at')}
                    value={issuedAtDisplay}
                  />
                )}

                {expiresDisplay && (
                  <KeyValueRow
                    layout="stacked"
                    label={t('dapp.siws_expires', 'Expires')}
                    value={expiresDisplay}
                  />
                )}

                {isOffchainMessage && (
                  <p style={bodyText(tokens)}>
                    {t(
                      'dapp.sign_in_offchain_note',
                      'This message will be signed as a Solana off-chain message (OCMS).'
                    )}
                  </p>
                )}

                <TextButton
                  onPress={() => setShowRaw((value) => !value)}
                  color={tokens.text.secondary}
                  icon={
                    showRaw ? (
                      <CaretUpIcon size={iconSize.sm} />
                    ) : (
                      <CaretDownIcon size={iconSize.sm} />
                    )
                  }
                  testID="siws-raw-toggle"
                >
                  {showRaw
                    ? t('dapp.siws_hide_raw', 'Hide raw message')
                    : t('dapp.siws_view_raw', 'View raw message')}
                </TextButton>

                {showRaw && (
                  <Card tone="shelf" padding="sm" radius="lg" testID="siws-raw">
                    <pre style={monoText(tokens)}>{messageText}</pre>
                  </Card>
                )}
              </>
            ) : (
              <p style={{ ...bodyText(tokens), color: tokens.text.primary }}>
                {t(
                  'dapp.sign_in_invalid_request',
                  'This sign-in request is invalid and cannot be signed.'
                )}
              </p>
            )}
          </Card>
        </div>
      }
      secondary={
        <SecondaryButton onPress={onReject} disabled={loading} fullWidth>
          {t('dapp.reject', 'Reject').toUpperCase()}
        </SecondaryButton>
      }
      action={
        <PrimaryButton onPress={onApprove} loading={loading} disabled={!canApprove} fullWidth>
          {t('dapp.sign_in_action', 'Sign In').toUpperCase()}
        </PrimaryButton>
      }
    />
  );
}
