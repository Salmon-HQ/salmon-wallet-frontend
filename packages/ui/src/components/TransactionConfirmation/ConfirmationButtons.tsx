/**
 * ConfirmationButtons — the Back/Confirm pair under the confirmation, on the
 * DOM. The pair stacks, secondary above primary, the app's band order.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { spacing } from '@salmon/shared';

import { PrimaryButton, SecondaryButton } from '../Button';
import type { ConfirmationButtonsProps } from './types';

export function ConfirmationButtons({
  onBack,
  onConfirm,
  isRefreshing = false,
  confirmLabel,
  style,
}: ConfirmationButtonsProps) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, ...style }}>
      <SecondaryButton testID="confirmation-back-button" onPress={onBack} disabled={isRefreshing}>
        {t('general.back')}
      </SecondaryButton>
      <PrimaryButton
        testID="confirmation-confirm-button"
        onPress={onConfirm}
        loading={isRefreshing}
        disabled={isRefreshing}
      >
        {confirmLabel ?? t('general.confirm')}
      </PrimaryButton>
    </div>
  );
}
