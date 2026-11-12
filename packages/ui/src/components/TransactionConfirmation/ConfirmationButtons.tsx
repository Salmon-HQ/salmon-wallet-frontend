/**
 * ConfirmationButtons — the Back/Confirm pair under the confirmation, on the
 * DOM. The pair stacks, secondary above primary, the app's band order. A
 * review that needs a deliberate act (the dApp hold cases) holds instead of
 * tapping, as the mobile twin does.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { spacing } from '@salmon/shared';

import { PrimaryButton, SecondaryButton } from '../Button';
import { HoldToApproveButton } from '../HoldToApproveButton';
import type { ConfirmationButtonsProps } from './types';

export function ConfirmationButtons({
  onBack,
  onConfirm,
  isRefreshing = false,
  confirmDisabled = false,
  requiresHold = false,
  confirmLabel,
  style,
}: ConfirmationButtonsProps) {
  const { t } = useTranslation();
  const label = confirmLabel ?? t('general.confirm');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, ...style }}>
      <SecondaryButton testID="confirmation-back-button" onPress={onBack} disabled={isRefreshing}>
        {t('general.back')}
      </SecondaryButton>
      {requiresHold ? (
        <HoldToApproveButton
          testID="confirmation-hold-button"
          onApprove={onConfirm}
          loading={isRefreshing}
          disabled={isRefreshing || confirmDisabled}
        >
          {label}
        </HoldToApproveButton>
      ) : (
        <PrimaryButton
          testID="confirmation-confirm-button"
          onPress={onConfirm}
          loading={isRefreshing}
          disabled={isRefreshing || confirmDisabled}
        >
          {label}
        </PrimaryButton>
      )}
    </div>
  );
}
