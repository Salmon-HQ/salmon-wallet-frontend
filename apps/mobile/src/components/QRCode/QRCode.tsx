/**
 * QRCode — a value encoded as a code, on React Native. DOM twin:
 * `packages/ui/src/components/QRCode`.
 *
 * `brandKnockout` draws the salmon mark on a centred knockout over the code —
 * the receive sheet's mark, now a kit prop so a second code (a payment
 * request) wears the same one. The knockout covers 24% of the code's width,
 * under the ~30% a level-H code can lose and still scan, so the level is
 * forced to H when the mark is on.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import QRCodeSVG from 'react-native-qrcode-svg';
import { BrandMark } from '../BrandMark';
import type { QRCodeProps } from './types';

const QR_LOGO_KNOCKOUT_RATIO = 0.24;
const QR_LOGO_MARK_RATIO = 0.66; // of the knockout, so the mark never touches modules

const QRCode: React.FC<QRCodeProps> = ({
  value,
  size,
  backgroundColor = '#FFFFFF',
  color = '#000000',
  ecLevel = 'M',
  brandKnockout = false,
  testID,
}) => {
  const knockout = Math.round(size * QR_LOGO_KNOCKOUT_RATIO);
  return (
    <View testID={testID}>
      <QRCodeSVG
        value={value}
        size={size}
        backgroundColor={backgroundColor}
        color={color}
        ecl={brandKnockout ? 'H' : ecLevel}
      />
      {brandKnockout && (
        <View style={styles.overlay} pointerEvents="none">
          <View
            testID={testID ? `${testID}-logo` : undefined}
            style={[
              styles.knockout,
              {
                width: knockout,
                height: knockout,
                borderRadius: knockout / 4,
                backgroundColor,
              },
            ]}
          >
            <BrandMark size={Math.round(knockout * QR_LOGO_MARK_RATIO)} color={color} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knockout: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default QRCode;
