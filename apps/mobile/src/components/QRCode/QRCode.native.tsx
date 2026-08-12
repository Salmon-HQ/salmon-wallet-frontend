import React from 'react';
import QRCodeSVG from 'react-native-qrcode-svg';
import type { QRCodeProps } from './types';

const QRCode: React.FC<QRCodeProps> = ({
  value,
  size,
  backgroundColor = '#FFFFFF',
  color = '#000000',
}) => <QRCodeSVG value={value} size={size} backgroundColor={backgroundColor} color={color} />;

export default QRCode;
