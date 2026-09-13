/**
 * TokenSelectList — the send flow's token picker, one pick per opening.
 *
 * The mobile twin is `apps/mobile/src/components/TokenSelectList.tsx`:
 * the `SearchField` pill, then a `ListRow` per token (its logo, its name, its
 * balance), 20 between every sibling. The "Select Token" heading is the
 * sheet's own title, drawn by the container.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  tabularNums,
  tokenBalanceLabel,
  useTokenSelectList,
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

export function TokenSelectList({
  tokens,
  onSelectToken,
  loading,
  showBalances = true,
  verifiedOnly = true,
  onSearch,
}: TokenSelectListProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();

  // The verified filter and the search — local, or the catalogue with `onSearch`.
  const {
    searchQuery,
    setSearchQuery,
    displayTokens: filteredTokens,
    isSearching,
  } = useTokenSelectList(tokens, { verifiedOnly, onSearch });

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
        {loading || isSearching ? (
          <SkeletonRow
            count={SKELETON_COUNT}
            leadingSize={LOGO_SIZE}
            lines={1}
            trailingWidth={80}
            accessibilityLabel={t('accessibility.loading_token_list')}
          />
        ) : (
          filteredTokens.map((token) => {
            const trailing = showBalances ? tokenBalanceLabel(token) : token.symbol;
            return (
              <ListRow
                key={token.address}
                testID={`send-token-row-${token.symbol}`}
                onPress={() => onSelectToken(token)}
                accessibilityLabel={`${token.name}, ${trailing}`}
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
                    {trailing}
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
