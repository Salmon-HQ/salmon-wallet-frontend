/**
 * NftMedia — an NFT's image, square, with the fallback every NFT screen shares.
 *
 * The mobile twin is `apps/mobile/src/components/NftMedia`. The detail, the
 * send review and the burn review all show the piece the user is acting on;
 * an NFT whose image is missing or fails to load is drawn as the primary fill,
 * so the screen never shows an empty hole.
 */
import React, { useState } from 'react';
import { borderRadius, type NftMediaPropsBase } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';

export interface NftMediaProps extends NftMediaPropsBase {
  alt: string;
  style?: React.CSSProperties;
}

export function NftMedia({ image, alt, style, testID }: NftMediaProps) {
  const semantic = useSemantic();
  const [failed, setFailed] = useState(false);

  return (
    <div data-testid={testID} style={{ ...frameStyle, ...style }}>
      {!image || failed ? (
        <span style={{ ...fillStyle, backgroundColor: semantic.accent.fill }} />
      ) : (
        <img
          data-testid={testID ? `${testID}-image` : undefined}
          src={image}
          alt={alt}
          decoding="async"
          onError={() => setFailed(true)}
          style={fillStyle}
        />
      )}
    </div>
  );
}

const frameStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '1 / 1',
  borderRadius: borderRadius.r4,
  overflow: 'hidden',
  flexShrink: 0,
};

const fillStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};
