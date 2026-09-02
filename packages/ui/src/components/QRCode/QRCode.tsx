/**
 * QRCode — a value encoded as a code, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/QRCode/QRCode.tsx`
 * (`react-native-qrcode-svg`); here `qrcode.react` draws the same SVG. The
 * inks default to the pair the receive sheet passes on both platforms —
 * `text.primary` as the code's ground, `depth.abyss` as the module ink — so
 * a code drawn without explicit colours still reads the live mode.
 */
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { useSemantic } from '../../theme/ThemeProvider';
import type { QRCodeProps } from './types';

export function QRCode({
  value,
  size,
  backgroundColor,
  color,
  ecLevel = 'M',
  className,
  style,
}: QRCodeProps) {
  const t = useSemantic();
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
    >
      <QRCodeSVG
        value={value}
        size={size}
        bgColor={backgroundColor ?? t.text.primary}
        fgColor={color ?? t.depth.abyss}
        level={ecLevel}
      />
    </span>
  );
}
