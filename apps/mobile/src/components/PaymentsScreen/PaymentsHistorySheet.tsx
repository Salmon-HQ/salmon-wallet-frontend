/**
 * PaymentsHistorySheet — every request this account made on this device,
 * newest first, as a sheet the tab raises from its clock (owner,
 * 2026-09-17: a sheet on mobile, a page of Home's stack on the DOM — the
 * same split as the catalogue). The same rows and the same request sheet as
 * the tab; a row's sheet rises as this one's child. DOM twin:
 * `PaymentsPage/PaymentsHistoryPage`.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { s, spacing, vs, type Semantic } from '@salmon/shared';
import { usePaymentsScreenLogic } from '@salmon/shared/powerups';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { StateBlock } from '../StateBlock';
import { PaymentRequestList } from './PaymentRequestList';
import type { PaymentsHistorySheetProps } from './types';

export function PaymentsHistorySheet({
  publicKey,
  networkId,
  visible,
  onBack,
  height,
  style,
  testID = 'payments-history',
}: PaymentsHistorySheetProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { standardContentBottomPadding } = useBottomSheetChrome();
  const { list, sheet, unavailable } = usePaymentsScreenLogic({
    publicKey,
    networkId,
    scope: 'all',
  });
  const { nested: _nested, ...request } = sheet;

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onBack}
      height={height}
      testID={testID}
      style={style}
      title={
        <SheetTitle subtitle={t('payments.history.subtitle')}>
          {t('payments.history.title')}
        </SheetTitle>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: standardContentBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {unavailable ? (
          <StateBlock tone="error" testID="payments-unavailable" title={unavailable} />
        ) : (
          <PaymentRequestList rows={list.rows} empty={list.empty} sheet={request} />
        )}
      </ScrollView>
    </BottomSheetContainer>
  );
}

const stylesFor = (_t: Semantic) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
    },
  });
