/**
 * PaymentsPage — the Payments Powerup on the DOM: three actions over what
 * is still waiting to be paid, the sheet that asks, and the sheet that
 * shows one request as a code. Paid and expired requests live behind the
 * clock, on the history page (owner, 2026-09-16). Every prop is composed in
 * the shared hook; this file only renders. Mobile twin:
 * `apps/mobile/src/components/PaymentsScreen`.
 */
import React from 'react';
import { spacing } from '@salmon/shared';
import { usePaymentsScreenLogic } from '@salmon/shared/powerups';

import { ClockIcon, PlusIcon, QrCodeIcon } from '../../icons';
import { IconBubble } from '../IconBubble';
import { SectionLabel } from '../SectionLabel';
import { StateBlock } from '../StateBlock';
import { ValueActionsRow } from '../ValueActionsRow';
import { PaymentsAskSheet } from './PaymentsAskSheet';
import { PaymentRequestList } from './PaymentRequestList';
import { PaymentRequestSheet } from './PaymentRequestSheet';
import type { PaymentsPageProps } from './types';

export function PaymentsPage({
  style,
  testID = 'payments-screen',
  ...logicParams
}: PaymentsPageProps) {
  const { actions, ask, list, sheet, unavailable } = usePaymentsScreenLogic({
    ...logicParams,
    scope: 'pending',
  });
  const { nested, ...request } = sheet;

  const root: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.screenGutter,
    flex: 1,
    minHeight: 0,
    padding: `0 ${spacing.headerPadding}px ${spacing.screenGutter}px`,
    ...style,
  };

  if (unavailable) {
    return (
      <div data-testid={testID} style={root}>
        <StateBlock tone="error" testID="payments-unavailable" title={unavailable} />
      </div>
    );
  }

  return (
    <div data-testid={testID} style={root}>
      <ValueActionsRow
        testID="payments-actions"
        leading={<SectionLabel variant="caps">{actions.title}</SectionLabel>}
        actions={
          <>
            {actions.history && <IconBubble icon={ClockIcon} {...actions.history} />}
            <IconBubble icon={PlusIcon} {...actions.ask} />
            {actions.pay && <IconBubble icon={QrCodeIcon} {...actions.pay} />}
          </>
        }
      />
      {/* The list owns the request sheet for a row it opened; a request born
          in the ask sheet is that sheet's child instead — the ask slides
          down, the request rises, one backdrop throughout. */}
      <PaymentRequestList
        rows={list.rows}
        empty={list.empty}
        sheet={{ ...request, visible: request.visible && !nested }}
      />
      <PaymentsAskSheet testID="payments-ask" {...ask}>
        {nested && <PaymentRequestSheet testID="payments-sheet" {...request} />}
      </PaymentsAskSheet>
    </div>
  );
}
