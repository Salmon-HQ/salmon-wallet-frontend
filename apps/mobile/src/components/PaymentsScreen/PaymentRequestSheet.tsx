/**
 * PaymentRequestSheet — one payment request as a code, on React Native: the
 * QR on the thermocline, the amount, the facts the network gives, and the
 * controls that copy or remove it. One state; the second tap only
 * dismisses. Every label and handler arrives composed from the shared hook.
 * DOM twin: `packages/ui/src/components/PaymentsPage/PaymentRequestSheet`.
 */
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  borderRadius,
  componentSizes,
  fontFamilyNative,
  fontSize,
  ms,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { SecondaryButton } from '../Button';
import { Card } from '../Card';
import { ExplorerLinkButton } from '../ExplorerLinkButton';
import { FactsCard } from '../FactsCard';
import { WarningNotice } from '../WarningNotice';
import QRCode from '../QRCode';
import type { PaymentRequestSheetProps } from './types';

// The sheet's own gutter: the QR spans the width inside it.
const CONTENT_PADDING_HORIZONTAL = spacing.screenGutter;

export function PaymentRequestSheet({
  visible,
  onClose,
  title,
  uri,
  showCode,
  amountLabel,
  status,
  checkFailedNotice,
  copyButton,
  removeButton,
  style,
  testID = 'payment-request-sheet',
}: PaymentRequestSheetProps) {
  const styles = useThemedStyles(stylesFor);
  const { text, depth } = useSemantic();
  const { width: screenWidth } = useWindowDimensions();
  const { spaciousContentBottomPadding } = useBottomSheetChrome();
  const qrSize = screenWidth - CONTENT_PADDING_HORIZONTAL * 2 - componentSizes.qrBorderWidth * 2;
  const { label: removeLabel, ...removePress } = removeButton;
  const { label: copyLabel, ...copyPress } = copyButton;

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      title={<SheetTitle>{title}</SheetTitle>}
      testID={testID}
      style={style}
    >
      <View style={[styles.content, { paddingBottom: spaciousContentBottomPadding }]}>
        {showCode && (
          <View style={styles.qrContainer} testID={`${testID}-qr`}>
            <QRCode
              testID={`${testID}-code`}
              value={uri}
              size={qrSize}
              backgroundColor={text.primary}
              color={depth.abyss}
              brandKnockout
            />
          </View>
        )}
        <Card padding="lg" testID={`${testID}-amount-card`}>
          <Text style={styles.amount} testID={`${testID}-amount`}>
            {amountLabel}
          </Text>
        </Card>
        {status && <FactsCard testID={`${testID}-facts`} rows={status.rows} />}
        {checkFailedNotice && <WarningNotice tone="info" title={checkFailedNotice} />}
        {status?.explorer && <ExplorerLinkButton {...status.explorer} />}
        {showCode && (
          <SecondaryButton testID={`${testID}-copy`} {...copyPress}>
            {copyLabel}
          </SecondaryButton>
        )}
        <SecondaryButton testID={`${testID}-remove`} tone="danger" {...removePress}>
          {removeLabel}
        </SecondaryButton>
      </View>
    </BottomSheetContainer>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    // 12 under the sheet's title, then the component gap of 20 between
    // blocks (DESIGN.md §Layout).
    content: {
      alignItems: 'stretch',
      paddingHorizontal: s(CONTENT_PADDING_HORIZONTAL),
      paddingTop: vs(spacing.md),
      gap: vs(spacing.xl),
    },
    qrContainer: {
      alignSelf: 'center',
      borderRadius: ms(borderRadius.xl),
      borderWidth: componentSizes.qrBorderWidth,
      borderColor: t.text.primary,
      overflow: 'hidden',
    },
    amount: {
      fontSize: ms(fontSize.balance),
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
      textAlign: 'center',
    },
  });

export default PaymentRequestSheet;
