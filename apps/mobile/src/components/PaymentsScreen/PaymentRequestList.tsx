/**
 * PaymentRequestList — the requests as rows, and the sheet that opens one.
 * The tab draws it with the pending requests, the history screen with all
 * of them; neither restates a row. DOM twin: `PaymentsPage/PaymentRequestList`.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing, vs } from '@salmon/shared';

import { powerupIcons } from '../../icons';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { StateBlock } from '../StateBlock';
import { PaymentRequestSheet } from './PaymentRequestSheet';
import type { PaymentRequestListProps } from './types';

export function PaymentRequestList({
  rows,
  empty,
  sheet,
  style,
  testID = 'payments-list',
}: PaymentRequestListProps) {
  return (
    <View style={[styles.list, style]} testID={testID}>
      {rows.length === 0 ? (
        <StateBlock tone="empty" testID="payments-empty" {...empty} />
      ) : (
        rows.map((row) => (
          <ListRow
            key={row.id}
            testID={`payments-row-${row.id}`}
            {...row.listRow}
            leading={<IconBubble {...row.bubble} icon={powerupIcons.QrCode} />}
            trailing={<KeyValueRow {...row.trailing} />}
          />
        ))
      )}
      <PaymentRequestSheet testID="payments-sheet" {...sheet} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: vs(spacing.screenGutter),
  },
});
