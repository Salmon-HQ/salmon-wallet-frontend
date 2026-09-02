/**
 * TokenList — the Portfolio tab's list of holdings, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/TokenList/TokenList.tsx`:
 * one `TokenListItem` per token, 20 apart — card → card is a
 * sibling-component seam, so it takes the component gap rather than an
 * internal-anatomy step (DESIGN.md §Layout).
 *
 * The skeleton is the list's own empty state, never a sibling rendered
 * outside it: a placeholder outside the list never receives the padding the
 * host passes, and ran edge to edge while the rows it stood in for kept the
 * screen gutter.
 *
 * Mobile virtualises with a `FlatList`; the side panel scrolls a plain column,
 * which is what the panel's own height makes cheap.
 */
import React from 'react';
import { spacing } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { SkeletonRow } from '../SkeletonRow';
import { TOKEN_ROW_GAP, TokenListItem } from './TokenListItem';
import type { TokenListProps, TokenListSkeletonProps } from './types';

export function TokenListSkeleton({ count = 5 }: TokenListSkeletonProps) {
  const { t } = useTranslation();
  return (
    <SkeletonRow
      padding="lg"
      leadingSize={44}
      trailingWidth={64}
      count={count}
      accessibilityLabel={t('accessibility.loading_token_info', 'Loading token information')}
    />
  );
}

export function TokenList({
  tokens,
  loading = false,
  onTokenPress,
  hiddenBalance = false,
  blockchain = 'solana',
  maxHeight,
  style,
  className,
}: TokenListProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: TOKEN_ROW_GAP,
        ...(maxHeight != null ? { maxHeight, overflowY: 'auto' } : null),
        // The list's own breathing room above the first card, so a row never
        // sits flush against the seam fade above it.
        paddingTop: spacing.sm,
        ...style,
      }}
    >
      {loading ? (
        <TokenListSkeleton />
      ) : (
        tokens.map((token) => (
          <TokenListItem
            key={token.address}
            token={token}
            onPress={onTokenPress}
            hiddenBalance={hiddenBalance}
            blockchain={blockchain}
          />
        ))
      )}
    </div>
  );
}
