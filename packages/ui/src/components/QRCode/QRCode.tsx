/**
 * QRCode — a value encoded as a code, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/QRCode/QRCode.tsx`
 * (`react-native-qrcode-svg`); here `qrcode.react` draws the same SVG. The
 * inks default to the pair the receive sheet passes on both platforms —
 * `text.primary` as the code's ground, `depth.abyss` as the module ink — so
 * a code drawn without explicit colours still reads the live mode.
 *
 * `brandKnockout` draws the salmon mark on a centred knockout over the code —
 * the receive sheet's mark, now a kit prop so a second code (a payment
 * request) wears the same one. The knockout covers 24% of the code's width,
 * under the ~30% a level-H code can lose and still scan, so the level is
 * forced to H when the mark is on.
 */
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { useSemantic } from '../../theme/ThemeProvider';
import { BrandMark } from '../BrandMark';
import type { QRCodeProps } from './types';

const QR_LOGO_KNOCKOUT_RATIO = 0.24;
const QR_LOGO_MARK_RATIO = 0.66; // of the knockout, so the mark never touches modules

export function QRCode({
  value,
  size,
  backgroundColor,
  color,
  ecLevel = 'M',
  brandKnockout = false,
  testID,
  className,
  style,
}: QRCodeProps) {
  const t = useSemantic();
  const ground = backgroundColor ?? t.text.primary;
  const ink = color ?? t.depth.abyss;
  const knockout = Math.round(size * QR_LOGO_KNOCKOUT_RATIO);
  return (
    <span
      data-testid={testID}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
        ...style,
      }}
    >
      <QRCodeSVG
        value={value}
        size={size}
        bgColor={ground}
        fgColor={ink}
        level={brandKnockout ? 'H' : ecLevel}
      />
      {brandKnockout && (
        <span
          data-testid={testID ? `${testID}-logo` : undefined}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: knockout,
            height: knockout,
            borderRadius: knockout / 4,
            backgroundColor: ground,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <BrandMark size={Math.round(knockout * QR_LOGO_MARK_RATIO)} color={ink} />
        </span>
      )}
    </span>
  );
}
