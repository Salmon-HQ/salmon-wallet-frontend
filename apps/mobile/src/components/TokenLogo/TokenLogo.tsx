import { colors, ms, fontFamilyNative } from '@salmon/shared';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, type ImageStyle, type ViewStyle } from 'react-native';

interface TokenLogoProps {
  uri?: string;
  symbol?: string;
  size: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const TokenLogo: React.FC<TokenLogoProps> = ({ uri, symbol, size, borderRadius, style }) => {
  const [error, setError] = useState(false);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  const radius = borderRadius ?? size / 2;
  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: 'hidden',
    ...style,
  };

  if (!uri || error) {
    const label = symbol ? symbol.slice(0, 3).toUpperCase() : '?';
    return (
      <View style={[styles.fallback, containerStyle]}>
        <Text style={[styles.fallbackText, { fontSize: ms(size * 0.32) }]}>{label}</Text>
      </View>
    );
  }

  return (
    <Image
      source={uri}
      style={containerStyle as ImageStyle}
      contentFit="cover"
      onError={handleError}
    />
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.medium,
  },
});

export default TokenLogo;
