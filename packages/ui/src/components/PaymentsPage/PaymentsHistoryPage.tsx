/**
 * PaymentsHistoryPage — every request this account made on this device,
 * newest first, a page of Home's stack behind the tab's clock (owner,
 * 2026-09-16). The same rows and the same sheet as the tab; only the scope
 * differs. Mobile twin: `PaymentsScreen/PaymentsHistoryScreen`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePaymentsScreenLogic } from '@salmon/shared/powerups';

import { SettingsPanelContent } from '../SettingsPanelContent';
import { StateBlock } from '../StateBlock';
import { PaymentRequestList } from './PaymentRequestList';
import type { PaymentsHistoryPageProps } from './types';

export function PaymentsHistoryPage({
  publicKey,
  networkId,
  onBack,
  style,
  className,
  testID = 'payments-history-screen',
}: PaymentsHistoryPageProps) {
  const { t } = useTranslation();
  const { list, sheet, unavailable } = usePaymentsScreenLogic({
    publicKey,
    networkId,
    scope: 'all',
  });
  const { nested: _nested, ...request } = sheet;

  return (
    <SettingsPanelContent
      testID={testID}
      title={t('payments.history.title')}
      subtitle={t('payments.history.subtitle')}
      onBack={onBack}
      className={className}
      style={style}
    >
      {unavailable ? (
        <StateBlock tone="error" testID="payments-unavailable" title={unavailable} />
      ) : (
        <PaymentRequestList rows={list.rows} empty={list.empty} sheet={request} />
      )}
    </SettingsPanelContent>
  );
}
