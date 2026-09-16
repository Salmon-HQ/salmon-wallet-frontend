/**
 * PaymentRequestSheet — one payment request as a code, on React Native: the
 * QR on the thermocline, the amount, the facts the network gives, and the
 * controls that share or remove it. One state; the second tap only
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
  type NetworkEnvironment,
  type Semantic,
} from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { SecondaryButton } from '../Button';
import { ExplorerLinkButton } from '../ExplorerLinkButton';
import { FactsCard } from '../FactsCard';
import { Thermocline } from '../Thermocline';
import { WarningNotice } from '../WarningNotice';
import QRCode from '../QRCode';
import type { PaymentRequestSheetProps } from './types';

const CONTENT_PADDING_HORIZONTAL = 24;

export function PaymentRequestSheet({
  visible,
  onClose,
  title,
  uri,
  showCode,
  amountLabel,
  status,
  checkFailedNotice,
  shareLabel,
  removeButton,
  onShare,
  style,
  testID = 'payment-request-sheet',
}: PaymentRequestSheetProps) {
  const styles = useThemedStyles(stylesFor);
  const { text, depth } = useSemantic();
  const { width: screenWidth } = useWindowDimensions();
  const { spaciousContentBottomPadding } = useBottomSheetChrome();
  const qrSize = screenWidth - CONTENT_PADDING_HORIZONTAL * 2 - componentSizes.qrBorderWidth * 2;
  const { label: removeLabel, ...removePress } = removeButton;

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      title={<SheetTitle>{title}</SheetTitle>}
      testID={testID}
      style={[styles.sheetContainer, style]}
      background={<Thermocline tier="thick" style={styles.thermocline} />}
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
        <Text style={styles.amount} testID={`${testID}-amount`}>
          {amountLabel}
        </Text>
        {status && <FactsCard testID={`${testID}-facts`} rows={status.rows} />}
        {checkFailedNotice && <WarningNotice tone="info" title={checkFailedNotice} />}
        {status?.explorer && (
          <ExplorerLinkButton
            {...status.explorer}
            environment={status.explorer.environment as NetworkEnvironment}
          />
        )}
        {showCode && onShare && (
          <SecondaryButton testID={`${testID}-share`} onPress={onShare}>
            {shareLabel}
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
    sheetContainer: {
      maxHeight: '92%',
      overflow: 'hidden',
    },
    thermocline: {
      ...StyleSheet.absoluteFillObject,
      borderTopLeftRadius: borderRadius.card,
      borderTopRightRadius: borderRadius.card,
    },
    content: {
      alignItems: 'stretch',
      paddingHorizontal: s(CONTENT_PADDING_HORIZONTAL),
      gap: vs(spacing.screenGutter),
    },
    qrContainer: {
      alignSelf: 'center',
      marginTop: vs(spacing.headerPadding),
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
