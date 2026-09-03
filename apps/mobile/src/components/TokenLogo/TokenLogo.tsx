import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import { type ImageStyle, type ViewStyle } from 'react-native';

import { IconBubble } from '../IconBubble';
import type { IconBubbleSize } from '../IconBubble/types';

interface TokenLogoProps {
  uri?: string;
  symbol?: string;
  size: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// `IconBubble` takes a closed size union; `TokenLogo`'s callers pass whatever
// pixel value their layout measured. The fallback rounds to the nearest kit
// step rather than growing a tenth bubble size for one caller.
const BUBBLE_SIZES: IconBubbleSize[] = [24, 36, 38, 40, 42, 44, 48, 76, 88];

function nearestBubbleSize(size: number): IconBubbleSize {
  return BUBBLE_SIZES.reduce((closest, candidate) =>
    Math.abs(candidate - size) < Math.abs(closest - size) ? candidate : closest
  );
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
      // `size` here already arrives scaled (callers pass `s(px)` or a raw
      // design constant) while `IconBubble.size` is a token it scales itself
      // — the nearest union step only picks the glyph ratio; the exact box
      // still comes from `containerStyle` via `style`, which wins last.
      <IconBubble size={nearestBubbleSize(size)} shape="circle" tone="ink" style={containerStyle}>
        {label}
      </IconBubble>
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

export default TokenLogo;
