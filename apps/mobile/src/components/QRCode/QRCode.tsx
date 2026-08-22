import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { QRCodeProps } from './types';

const QRCode: React.FC<QRCodeProps> = ({
  value,
  size,
  backgroundColor = '#FFFFFF',
  color = '#000000',
  ecLevel = 'M',
}) => (
  <QRCodeSVG value={value} size={size} bgColor={backgroundColor} fgColor={color} level={ecLevel} />
);

export default QRCode;
