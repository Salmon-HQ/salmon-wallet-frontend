import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatOrigin,
  getShortAddress,
  isTransactionLookalike,
  parseOffchainMessageForApproval,
  spacing,
} from '@salmon/shared';

import { GlobeIcon, LockIcon, PenNibIcon } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton, SecondaryButton } from '../Button';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { OnboardingDescription, OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { WarningNotice } from '../WarningNotice';
import { AppIdentity } from './AppIdentity';
import { CardHead, bodyText, cardColumn, monoText } from './common';
import type { DAppSignMessageApprovalViewProps } from './types';

export function DAppSignMessageApprovalView({
  origin,
  appName,
  appIcon,
  messageText,
  data,
  requiredSigners,
  disabled = false,
  loading = false,
  onApprove,
  onReject,
}: DAppSignMessageApprovalViewProps): React.ReactElement {
  const { t } = useTranslation();
  const tokens = useSemantic();
  const displayOrigin = formatOrigin(origin);

  const isOffchainMessage = requiredSigners !== undefined;

  const offchainParsed = useMemo(() => {
    if (!isOffchainMessage || !data) return null;
    try {
      return parseOffchainMessageForApproval(data, requiredSigners);
    } catch {
      return null;
    }
  }, [isOffchainMessage, data, requiredSigners]);

  // The tx-lookalike guard only applies to the legacy raw `sign` path — OCMS's
  // domain-separated buffer prevents this collision by construction.
  const isLookalikeTransaction = useMemo(() => {
    if (isOffchainMessage || !data) return false;
    return isTransactionLookalike(Uint8Array.from(data));
  }, [isOffchainMessage, data]);

  return (
    <OnboardingLayout
      testID="dapp-sign-message-approval"
      variant="content"
      backgroundColor={tokens.surface.bedrock}
      markColor={tokens.accent.fill}
      scrollBody
      title={
        <OnboardingTitle testID="approval-title">
          {t('dapp.sign_message_title', 'Sign Message')}
        </OnboardingTitle>
      }
      description={
        <OnboardingDescription>
          {t(
            'dapp.sign_message_subtitle',
            'This app is requesting you to sign a message. This will not submit a transaction.'
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
                'dapp.sign_message_hint',
                'Read the message carefully. Message signatures can still authorize actions off-chain.'
              )}
            </p>
          </Card>

          <Card padding="lg" gap={spacing.md} style={cardColumn}>
            <CardHead
              icon={isOffchainMessage ? LockIcon : PenNibIcon}
              label={
                isOffchainMessage
                  ? t('dapp.offchain_message_label', 'Off-chain message (OCMS)')
                  : t('dapp.message', 'Message')
              }
            />

            {isLookalikeTransaction && (
              <WarningNotice title={t('dapp.sign_message_tx_lookalike_title', 'Signing blocked')}>
                {t(
                  'dapp.sign_message_tx_lookalike_warning',
                  'This app is trying to make you sign what is actually a transaction, disguised as a plain message. Salmon has refused to sign it to protect your funds.'
                )}
              </WarningNotice>
            )}

            {isOffchainMessage && offchainParsed ? (
              <>
                <Card tone="shelf" padding="sm" radius="lg" testID="ocms-content">
                  <pre style={monoText(tokens)}>{offchainParsed.content}</pre>
                </Card>
                {offchainParsed.requiredSignatories.map((signatory) => (
                  <KeyValueRow
                    key={signatory.address}
                    layout="stacked"
                    label={t('dapp.offchain_required_signer', 'Required signer')}
                    value={getShortAddress(signatory.address) ?? signatory.address}
                    valueFont="mono"
                  />
                ))}
              </>
            ) : (
              <Card tone="shelf" padding="sm" radius="lg" testID="raw-message">
                <pre style={monoText(tokens)}>{messageText}</pre>
              </Card>
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
        <PrimaryButton
          onPress={onApprove}
          loading={loading}
          disabled={
            disabled ||
            loading ||
            isLookalikeTransaction ||
            // Never offer to sign an OCMS request whose exact signing bytes could
            // not be built and rendered — the user must see what they sign.
            (isOffchainMessage && !offchainParsed)
          }
          fullWidth
        >
          {t('dapp.sign', 'Sign').toUpperCase()}
        </PrimaryButton>
      }
    />
  );
}
