/**
 * NftMedia — an NFT's image, square, with the fallback every NFT screen shares.
 *
 * The detail, the send review and the burn review all show the piece the user
 * is acting on. An NFT whose image is missing or fails to load is drawn as
 * the primary fill, flat, so the screen never shows an empty hole; while the
 * image loads, the same fill carries a spinner.
 */
import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, gradients, type NftMediaPropsBase } from '@salmon/shared';

import { useSemantic } from '../../theme/useThemedStyles';
import { Spinner } from '../Spinner';

/** The fallback the media falls back to — the primary fill, drawn flat. */
const FALLBACK_GRADIENT = {
  colors: [...gradients.primaryButton.colors],
  start: { x: 0.12, y: 0.5 },
  end: { x: 0.83, y: 0.5 },
} as const;

export interface NftMediaProps extends NftMediaPropsBase {
  /** Keys image recycling to the NFT, so a list never shows the previous one. */
  mint: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export function NftMedia({ image, mint, accessibilityLabel, style, testID }: NftMediaProps) {
  const semantic = useSemantic();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fill = (
    <LinearGradient
      colors={[...FALLBACK_GRADIENT.colors]}
      start={FALLBACK_GRADIENT.start}
      end={FALLBACK_GRADIENT.end}
      style={StyleSheet.absoluteFill}
    />
  );

  return (
    <View style={[styles.frame, style]} testID={testID}>
      {!image || failed ? (
        fill
      ) : (
        <>
          <Image
            testID={testID ? `${testID}-image` : undefined}
            source={image}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            autoplay
            recyclingKey={mint}
            accessibilityLabel={accessibilityLabel}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
          />
          {loading && (
            <View style={[StyleSheet.absoluteFill, styles.loading]}>
              {fill}
              <Spinner color={semantic.text.primary} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 1,
    borderRadius: borderRadius.r4,
    overflow: 'hidden',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
