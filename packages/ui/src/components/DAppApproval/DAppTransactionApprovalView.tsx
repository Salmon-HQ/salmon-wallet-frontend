import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatOrigin, spacing } from '@salmon/shared';

import { GlobeIcon, ReceiptIcon } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton, SecondaryButton } from '../Button';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { OnboardingDescription, OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { AppIdentity } from './AppIdentity';
import { CardHead, bodyText, cardColumn } from './common';
import { HoldToApproveButton } from './HoldToApproveButton';
import { TransactionEffectsCard } from './TransactionEffectsCard';
import type { DAppTransactionApprovalViewProps } from './types';

export function DAppTransactionApprovalView({
  origin,
  appName,
  appIcon,
  requestSummary,
  effects,
  effectsLoading,
  feeSol,
  instructionCount,
  feePayer,
  recentBlockhash,
  parsingError,
  disabled = false,
  loading = false,
  onApprove,
  onReject,
}: DAppTransactionApprovalViewProps): React.ReactElement {
  const { t } = useTranslation();
  const tokens = useSemantic();
  const displayOrigin = formatOrigin(origin);

  // A delegation, a failing transaction and an unreadable one are the three
  // things a reflex tap should not be able to sign. A plain send that the
  // preview understood keeps the ordinary button — friction everywhere is
  // friction nowhere.
  const requiresHold =
    effects != null &&
    (effects.kind === 'undetermined' ||
      effects.kind === 'transaction-would-fail' ||
      (effects.kind === 'effects' && effects.approvals.length > 0));

  const cannotApprove = disabled || loading || !!parsingError;

  return (
    <OnboardingLayout
      testID="dapp-transaction-approval"
      variant="content"
      backgroundColor={tokens.surface.bedrock}
      markColor={tokens.accent.fill}
      scrollBody
      title={
        <OnboardingTitle testID="approval-title">
          {t('dapp.transaction_title', 'Approve Transaction')}
        </OnboardingTitle>
      }
      description={
        <OnboardingDescription>
          {t(
            'dapp.transaction_subtitle',
            'Review the transaction details before approving this request.'
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
                'dapp.transaction_risk_hint',
                'Only approve if you trust the app and recognize the action being requested.'
              )}
            </p>
          </Card>

          <TransactionEffectsCard effects={effects} loading={effectsLoading} />

          <Card padding="lg" gap={spacing.md} style={cardColumn}>
            <CardHead
              icon={ReceiptIcon}
              label={t('dapp.transaction_overview', 'Transaction overview')}
            />
            <KeyValueRow label={t('dapp.method', 'Method')} value={requestSummary} />
            <KeyValueRow
              label={t('dapp.transaction_fee', 'Estimated fee')}
              value={feeSol ? `${feeSol} SOL` : '-'}
            />
            <KeyValueRow
              label={t('dapp.instructions', 'Instructions')}
              value={instructionCount != null ? String(instructionCount) : '-'}
            />
            <KeyValueRow
              label={t('dapp.transaction_status', 'Approval')}
              value={
                parsingError
                  ? t('dapp.transaction_unavailable', 'Review unavailable')
                  : t('dapp.transaction_ready', 'Ready to sign')
              }
            />
            <KeyValueRow
              layout="stacked"
              label={t('dapp.fee_payer', 'Fee payer')}
              value={feePayer || '-'}
              valueFont="mono"
            />
            <KeyValueRow
              layout="stacked"
              label={t('dapp.blockhash', 'Recent blockhash')}
              value={recentBlockhash || '-'}
              valueFont="mono"
            />
            {parsingError && (
              <KeyValueRow
                layout="stacked"
                label={t('dapp.error', 'Error')}
                value={t(
                  'dapp.decode_error',
                  'This transaction could not be decoded. Do not approve unless you trust this site.'
                )}
                valueTone="danger"
                testID="decode-error"
              />
            )}
          </Card>
        </div>
      }
      assist={
        requiresHold ? (
          <p style={{ ...bodyText(tokens), textAlign: 'center' }}>
            {t('dapp.hold_to_approve_hint', 'Hold the button to approve this request.')}
          </p>
        ) : undefined
      }
      secondary={
        <SecondaryButton onPress={onReject} disabled={loading} fullWidth>
          {t('dapp.reject', 'Reject').toUpperCase()}
        </SecondaryButton>
      }
      action={
        requiresHold ? (
          <HoldToApproveButton onApprove={onApprove} loading={loading} disabled={cannotApprove}>
            {t('dapp.hold_to_approve', 'Hold to Approve').toUpperCase()}
          </HoldToApproveButton>
        ) : (
          <PrimaryButton onPress={onApprove} loading={loading} disabled={cannotApprove} fullWidth>
            {t('dapp.approve_and_sign', 'Approve & Sign').toUpperCase()}
          </PrimaryButton>
        )
      }
    />
  );
}
