/**
 * TokenSelectList — the send flow's token picker, one pick per opening.
 *
 * The mobile twin is `apps/mobile/src/components/Send/TokenSelectList.tsx`:
 * the `SearchField` pill, then a `ListRow` per token (its logo, its name, its
 * balance), 20 between every sibling. The "Select Token" heading is the
 * sheet's own title, drawn by the container.
 */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  fontWeight,
  formatTokenAmount,
  lineHeight,
  spacing,
  tabularNums,
  useUnverifiedTokens,
  type SendToken,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { ListRow } from '../ListRow';
import { SearchField } from '../SearchField';
import { SkeletonRow } from '../SkeletonRow';
import { TokenLogo } from '../TokenList';
import type { TokenSelectListProps } from './types';

/** The row's identity mark — the 40 every list row in the kit carries. */
const LOGO_SIZE = 40;
/** How many placeholder rows stand in while the balances load. */
const SKELETON_COUNT = 5;

function balanceLabel(token: SendToken): string {
  const amount = typeof token.uiAmount === 'string' ? parseFloat(token.uiAmount) : token.uiAmount;
  if (amount === 0) return `0 ${token.symbol}`;
  if (amount < 0.0001) return `<${formatTokenAmount(0.0001)} ${token.symbol}`;
  return `${formatTokenAmount(amount)} ${token.symbol}`;
}

export function TokenSelectList({ tokens, onSelectToken, loading }: TokenSelectListProps) {
  const { t } = useTranslation();
  // Spec 026 D4: the unverified-tokens toggle owns this, read where it is used.
  const showUnverifiedTokens = useUnverifiedTokens();
  const semantic = useSemantic();
  const [searchQuery, setSearchQuery] = useState('');

  const verifiedTokens = useMemo(
    () =>
      tokens.filter((token) => {
        const hasMeaningfulTags =
          token.tags && token.tags.length > 0 && token.tags.some((tag) => tag !== 'unknown');
        return hasMeaningfulTags || !!showUnverifiedTokens;
      }),
    [tokens, showUnverifiedTokens]
  );

  const filteredTokens = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return verifiedTokens;
    return verifiedTokens.filter(
      (token) =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
    );
  }, [verifiedTokens, searchQuery]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        padding: `${spacing.screenGutter}px ${spacing.screenGutter}px 0`,
        gap: spacing.screenGutter,
      }}
    >
      <SearchField
        testID="send-token-search-input"
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('actions.search_placeholder', 'Search...')}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.screenGutter,
          paddingBottom: spacing.screenGutter,
        }}
      >
        {loading ? (
          <SkeletonRow
            count={SKELETON_COUNT}
            leadingSize={LOGO_SIZE}
            lines={1}
            trailingWidth={80}
            accessibilityLabel={t('accessibility.loading_token_list')}
          />
        ) : (
          filteredTokens.map((token) => {
            const balance = balanceLabel(token);
            return (
              <ListRow
                key={token.address}
                testID={`send-token-row-${token.symbol}`}
                onPress={() => onSelectToken(token)}
                accessibilityLabel={`${token.name}, ${balance}`}
                leading={
                  <TokenLogo
                    uri={token.logo || undefined}
                    symbol={token.symbol}
                    size={LOGO_SIZE}
                    borderRadius={LOGO_SIZE / 2}
                  />
                }
                title={token.name}
                trailing={
                  <span
                    style={{
                      fontFamily: fontFamily.sans,
                      fontWeight: fontWeight.bold,
                      fontSize: fontSize.body,
                      lineHeight: `${fontSize.body * lineHeight.snug}px`,
                      color: semantic.text.primary,
                      whiteSpace: 'nowrap',
                      ...tabularNums.css,
                    }}
                  >
                    {balance}
                  </span>
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}
