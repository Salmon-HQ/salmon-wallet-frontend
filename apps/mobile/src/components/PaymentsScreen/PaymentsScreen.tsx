/**
 * PaymentsScreen — the Payments Powerup on React Native: three actions over
 * what is still waiting to be paid, the sheet that asks, and the sheet that
 * shows one request as a code. Paid and expired requests live behind the
 * clock, on the history sheet (owner, 2026-09-16 / 17). Every prop is composed
 * in the shared hook; this file only renders. DOM twin:
 * `packages/ui/src/components/PaymentsPage`.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { s, spacing, vs } from '@salmon/shared';
import { usePaymentsScreenLogic } from '@salmon/shared/powerups';

import { ClockIcon, PlusIcon, QrCodeIcon } from '../../icons';
import { IconBubble } from '../IconBubble';
import { SectionLabel } from '../SectionLabel';
import { StateBlock } from '../StateBlock';
import { ValueActionsRow } from '../ValueActionsRow';
import { PaymentsAskSheet } from './PaymentsAskSheet';
import { PaymentsHistorySheet } from './PaymentsHistorySheet';
import { PaymentRequestList } from './PaymentRequestList';
import { PaymentRequestSheet } from './PaymentRequestSheet';
import type { PaymentsScreenProps } from './types';

export function PaymentsScreen({
  style,
  sheetHeight,
  testID = 'payments-screen',
  ...logicParams
}: PaymentsScreenProps) {
  // The history is a sheet here, the tab's own (owner, 2026-09-17).
  const [historyOpen, setHistoryOpen] = useState(false);
  const { actions, ask, list, sheet, unavailable } = usePaymentsScreenLogic({
    ...logicParams,
    scope: 'pending',
    onHistory: () => setHistoryOpen(true),
  });
  const { nested, ...request } = sheet;

  if (unavailable) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <StateBlock tone="error" testID="payments-unavailable" title={unavailable} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
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
      <PaymentsAskSheet testID="payments-ask" height={sheetHeight} {...ask}>
        {nested && <PaymentRequestSheet testID="payments-sheet" {...request} />}
      </PaymentsAskSheet>
      <PaymentsHistorySheet
        publicKey={logicParams.publicKey}
        networkId={logicParams.networkId}
        visible={historyOpen}
        onBack={() => setHistoryOpen(false)}
        height={sheetHeight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: s(spacing.headerPadding),
    gap: vs(spacing.screenGutter),
  },
});

export default PaymentsScreen;
