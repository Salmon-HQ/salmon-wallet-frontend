/**
 * WalletFamily — a wallet and the wallets derived from it, tied by a rail.
 *
 * The DOM twin of `apps/mobile/src/components/WalletFamily`: the parent's
 * card first; each derived card steps in one gutter, and a rail in
 * `border.default` leaves the parent, runs down through the gaps and meets
 * each derived card at a node in `text.accent` with a short tick into the
 * card. The rail ends at the last node. Nothing collapses.
 */
import React from 'react';
import { borderWidth, componentSizes, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import type { WalletFamilyProps } from './types';

export function WalletFamily({ parent, derived, style, className, testID }: WalletFamilyProps) {
  const tokens = useSemantic();
  const gutter = spacing.screenGutter;
  const node = componentSizes.walletRailNode;

  return (
    <div data-testid={testID} className={className} style={style}>
      {parent}
      {derived.map(({ id, card }, index) => (
        <div
          key={id}
          style={{ position: 'relative', marginTop: spacing.screenGutter, paddingLeft: gutter }}
        >
          <span
            data-testid={`wallet-rail-${id}`}
            aria-hidden
            style={{
              position: 'absolute',
              left: gutter / 2 - borderWidth.thin / 2,
              top: -spacing.screenGutter,
              bottom: index === derived.length - 1 ? '50%' : 0,
              width: borderWidth.thin,
              backgroundColor: tokens.border.default,
            }}
          />
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: gutter / 2,
              top: '50%',
              width: gutter / 2,
              height: borderWidth.thin,
              backgroundColor: tokens.border.default,
            }}
          />
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: gutter / 2 - node / 2,
              top: '50%',
              marginTop: -node / 2,
              width: node,
              height: node,
              borderRadius: node / 2,
              backgroundColor: tokens.text.accent,
            }}
          />
          {card}
        </div>
      ))}
    </div>
  );
}
