/**
 * PaymentsPage — the Payments Powerup on the DOM: two actions over the list
 * of what was asked, the sheet that asks, and the sheet that shows one
 * request as a code. Every prop is composed in the shared hook; this file
 * only renders. Mobile twin: `apps/mobile/src/components/PaymentsScreen`.
 */
import React from 'react';
import { spacing } from '@salmon/shared';
import { usePaymentsScreenLogic } from '@salmon/shared/powerups';

import { QrCodeIcon, ScanIcon, powerupIcons } from '../../icons';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { StateBlock } from '../StateBlock';
import { ValueActionsRow } from '../ValueActionsRow';
import { PaymentsAskSheet } from './PaymentsAskSheet';
import { PaymentRequestSheet } from './PaymentRequestSheet';
import type { PaymentsPageProps } from './types';

const column = (gap: number): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap,
});

export function PaymentsPage({
  style,
  testID = 'payments-screen',
  ...logicParams
}: PaymentsPageProps) {
  const { actions, ask, list, sheet, unavailable } = usePaymentsScreenLogic(logicParams);

  const root: React.CSSProperties = {
    ...column(spacing.screenGutter),
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
            <IconBubble icon={QrCodeIcon} {...actions.ask} />
            {actions.pay && <IconBubble icon={ScanIcon} {...actions.pay} />}
          </>
        }
      />
      {list.rows.length === 0 ? (
        <StateBlock tone="empty" testID="payments-empty" {...list.empty} />
      ) : (
        <div style={column(spacing.screenGutter)}>
          {list.rows.map((row) => (
            <ListRow
              key={row.id}
              testID={`payments-row-${row.id}`}
              {...row.listRow}
              leading={<IconBubble {...row.bubble} icon={powerupIcons.QrCode} />}
              trailing={<KeyValueRow {...row.trailing} />}
            />
          ))}
        </div>
      )}

      <PaymentsAskSheet testID="payments-ask" {...ask} />
      <PaymentRequestSheet testID="payments-sheet" {...sheet} />
    </div>
  );
}
