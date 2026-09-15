/**
 * PaymentRequestSheet — one payment request as a code, on the DOM: the QR,
 * the amount, the facts the network gives, and the controls that copy or
 * remove it. One state; the second tap only dismisses. Every label and
 * handler arrives composed from the shared hook.
 * Mobile twin: `apps/mobile/src/components/PaymentsScreen/PaymentRequestSheet`.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  borderRadius,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  type NetworkEnvironment,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { SecondaryButton } from '../Button';
import { ExplorerLinkButton } from '../ExplorerLinkButton';
import { FactsCard } from '../FactsCard';
import { QRCode } from '../QRCode';
import { WarningNotice } from '../WarningNotice';
import type { PaymentRequestSheetProps } from './types';

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
  className,
  style,
  testID = 'payment-request-sheet',
}: PaymentRequestSheetProps) {
  const semantic = useSemantic();
  const contentRef = useRef<HTMLDivElement>(null);
  const [qrSize, setQrSize] = useState<number>(componentSizes.qrCodeSize);
  const { label: copyLabel, ...copyPress } = copyButton;
  const { label: removeLabel, ...removePress } = removeButton;

  // The code fills the sheet's width minus its own border — measured, because
  // the panel is user-resizable.
  useEffect(() => {
    if (!visible || !contentRef.current) return undefined;
    const element = contentRef.current;
    const measure = () => {
      const width = element.clientWidth;
      if (width > 0) setQrSize(Math.floor(width - componentSizes.qrBorderWidth * 2));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      title={<SheetTitle>{title}</SheetTitle>}
      testID={testID}
      className={className}
      style={{ maxHeight: '92vh', overflow: 'hidden', ...style }}
    >
      <div
        ref={contentRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          paddingBottom: spacing['2xl'],
          gap: spacing.screenGutter,
        }}
      >
        {showCode && (
          <div
            data-testid={`${testID}-qr`}
            style={{
              alignSelf: 'center',
              marginTop: spacing.headerPadding,
              borderRadius: borderRadius.xl,
              border: `${componentSizes.qrBorderWidth}px solid ${semantic.text.primary}`,
              overflow: 'hidden',
              display: 'inline-flex',
              lineHeight: 0,
            }}
          >
            <QRCode
              testID={`${testID}-code`}
              value={uri}
              size={qrSize}
              backgroundColor={semantic.text.primary}
              color={semantic.depth.abyss}
              brandKnockout
            />
          </div>
        )}
        <span
          data-testid={`${testID}-amount`}
          style={{
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.bold,
            fontSize: fontSize.balance,
            color: semantic.text.primary,
            textAlign: 'center',
          }}
        >
          {amountLabel}
        </span>
        {status && <FactsCard testID={`${testID}-facts`} rows={status.rows} />}
        {checkFailedNotice && <WarningNotice tone="info" title={checkFailedNotice} />}
        {status?.explorer && (
          <ExplorerLinkButton
            {...status.explorer}
            environment={status.explorer.environment as NetworkEnvironment}
          />
        )}
        {showCode && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.md }}>
            <SecondaryButton testID={`${testID}-copy`} {...copyPress}>
              {copyLabel}
            </SecondaryButton>
          </div>
        )}
        <SecondaryButton testID={`${testID}-remove`} tone="danger" {...removePress}>
          {removeLabel}
        </SecondaryButton>
      </div>
    </BottomSheetContainer>
  );
}
