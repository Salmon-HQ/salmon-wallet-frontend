/**
 * SolanaPayRequestSheet — the merchant a Solana Pay transaction request names,
 * on the DOM, while the wallet contacts it and prepares the payment (spec 043).
 * Core's review takes over once the transaction is ready; this sheet only
 * draws what `useSolanaPayTransactionRequest` decided. The mobile twin is
 * `apps/mobile/src/components/SolanaPayRequestSheet`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { fontFamily, fontSize, fontWeight, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { PrimaryButton, SecondaryButton } from '../Button';
import { Spinner } from '../Spinner';
import { RequesterRow } from '../TransactionConfirmation/RequesterRow';
import { WarningNotice } from '../WarningNotice';
import type { SolanaPayRequestSheetProps } from './types';

export function SolanaPayRequestSheet({
  visible,
  merchant,
  phase,
  error,
  onRetry,
  onClose,
}: SolanaPayRequestSheetProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();

  return (
    <BottomSheetContainer visible={visible} onClose={onClose} testID="solana-pay-sheet">
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        <RequesterRow
          name={merchant.label}
          icon={merchant.icon}
          domain={merchant.domain}
          testID="solana-pay-merchant"
        />

        {phase === 'failed' ? (
          <div data-testid="solana-pay-error">
            <WarningNotice tone="warning" title={t(error?.key ?? 'solanaPay.errors.unreachable')}>
              {error?.merchantMessage
                ? t('solanaPay.merchantMessage', { message: error.merchantMessage })
                : null}
            </WarningNotice>
          </div>
        ) : (
          <div
            data-testid="solana-pay-status"
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              fontFamily: fontFamily.sans,
              fontSize: fontSize.body,
              fontWeight: fontWeight.medium,
              color: semantic.text.secondary,
            }}
          >
            <Spinner color={semantic.text.secondary} />
            <span data-testid="solana-pay-status-text">
              {t(phase === 'preparing' ? 'solanaPay.preparing' : 'solanaPay.contacting')}
            </span>
          </div>
        )}

        {onRetry ? (
          <PrimaryButton testID="solana-pay-retry" onPress={onRetry}>
            {t('solanaPay.retry')}
          </PrimaryButton>
        ) : null}

        <SecondaryButton testID="solana-pay-close" onPress={onClose}>
          {t('actions.close')}
        </SecondaryButton>
      </div>
    </BottomSheetContainer>
  );
}
