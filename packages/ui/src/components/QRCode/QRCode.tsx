/**
 * QRCode - QR code display component
 *
 * Web version using qrcode.react for browser extension.
 * Renders a QR code SVG for the given value (e.g., wallet address).
 */
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import { QRCodeSVG } from 'qrcode.react';
import type { QRCodeProps } from './types';

const Container = styled(Box)({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

/**
 * QRCode component for displaying encoded data as a QR code
 *
 * @example
 * ```tsx
 * <QRCode
 *   value="solana:7xKXtg..."
 *   size={200}
 * />
 * ```
 */
export function QRCode({
  value,
  size,
  backgroundColor = '#FFFFFF',
  color = '#000000',
  ecLevel = 'M',
  className,
  style,
}: QRCodeProps) {
  return (
    <Container className={className} style={style}>
      <QRCodeSVG value={value} size={size} bgColor={backgroundColor} fgColor={color} level={ecLevel} />
    </Container>
  );
}
