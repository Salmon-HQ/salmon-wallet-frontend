/**
 * PaymentsScreen — the Payments Powerup on React Native: two actions over
 * the list of what was asked, the sheet that asks, and the sheet that shows
 * one request as a code. Every prop is composed in the shared hook; this
 * file only renders. DOM twin: `packages/ui/src/components/PaymentsPage`.
 */
import React, { useCallback } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { s, spacing, vs } from '@salmon/shared';
import { usePaymentsScreenLogic } from '@salmon/shared/powerups';

import { PlusIcon, QrCodeIcon, powerupIcons } from '../../icons';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { StateBlock } from '../StateBlock';
import { ValueActionsRow } from '../ValueActionsRow';
import { PaymentsAskSheet } from './PaymentsAskSheet';
import { PaymentRequestSheet } from './PaymentRequestSheet';
import type { PaymentsScreenProps } from './types';

export function PaymentsScreen({
  style,
  sheetHeight,
  testID = 'payments-screen',
  ...logicParams
}: PaymentsScreenProps) {
  const { actions, ask, list, sheet, unavailable, openUri } = usePaymentsScreenLogic(logicParams);
  const { nested, ...request } = sheet;
  const onShare = useCallback(() => {
    if (openUri) void Share.share({ message: openUri });
  }, [openUri]);

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
            <IconBubble icon={PlusIcon} {...actions.ask} />
            {actions.pay && <IconBubble icon={QrCodeIcon} {...actions.pay} />}
          </>
        }
      />
      {list.rows.length === 0 ? (
        <StateBlock tone="empty" testID="payments-empty" {...list.empty} />
      ) : (
        <View style={styles.list}>
          {list.rows.map((row) => (
            <ListRow
              key={row.id}
              testID={`payments-row-${row.id}`}
              {...row.listRow}
              leading={<IconBubble {...row.bubble} icon={powerupIcons.QrCode} />}
              trailing={<KeyValueRow {...row.trailing} />}
            />
          ))}
        </View>
      )}

      {/* A request born in the ask sheet is that sheet's child: the ask
          slides down, the request rises, one backdrop throughout. */}
      <PaymentsAskSheet testID="payments-ask" height={sheetHeight} {...ask}>
        {nested && <PaymentRequestSheet testID="payments-sheet" {...request} onShare={onShare} />}
      </PaymentsAskSheet>
      {!nested && <PaymentRequestSheet testID="payments-sheet" {...request} onShare={onShare} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: s(spacing.headerPadding),
    gap: vs(spacing.screenGutter),
  },
  list: {
    gap: vs(spacing.screenGutter),
  },
});

export default PaymentsScreen;
