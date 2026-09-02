/**
 * TokenLogo — a token's mark, or its initial when there is none.
 *
 * The mobile twin is `apps/mobile/src/components/TokenLogo`. It is a leaf, so
 * it lives beside the row that composes it rather than in the kit's own
 * directory: nothing outside `TokenList` draws a token mark today.
 */
import React, { useState } from 'react';
import { fontFamily, fontSize, fontWeight, type Semantic } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';

export interface TokenLogoProps {
  uri?: string;
  symbol?: string;
  size: number;
  borderRadius: number;
}

export function TokenLogo({ uri, symbol, size, borderRadius }: TokenLogoProps) {
  const semantic = useSemantic();
  const [failed, setFailed] = useState(false);

  const box = boxStyle(semantic, size, borderRadius);

  if (!uri || failed) {
    return (
      <span
        style={{
          ...box,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: fontFamily.sans,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.bodyLg,
          color: semantic.text.secondary,
        }}
      >
        {symbol?.[0] ?? '?'}
      </span>
    );
  }

  return (
    <img
      src={uri}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ ...box, objectFit: 'cover' }}
    />
  );
}

const boxStyle = (t: Semantic, size: number, radius: number): React.CSSProperties => ({
  width: size,
  height: size,
  borderRadius: radius,
  backgroundColor: t.surface.raised,
  flexShrink: 0,
});
