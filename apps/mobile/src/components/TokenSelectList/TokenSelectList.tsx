/**
 * TokenSelectList — the send flow's token picker, one pick per opening.
 *
 * Composed from the kit the rest of the redesign is drawn with: the
 * `SearchField` pill, then a `ListRow` per token (its logo, its name, its
 * balance), 20 between every sibling per DESIGN.md's component gap. The
 * "Select Token" heading is the sheet's own title, drawn by the container.
 */
import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  spacing,
  tabularNums,
  vs,
  tokenBalanceLabel,
  useTokenSelectList,
  type Semantic,
} from '@salmon/shared';
import type { SendToken } from '@salmon/shared';

import { useThemedStyles } from '../../theme/useThemedStyles';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { ListRow } from '../ListRow';
import { SearchField } from '../SearchField';
import { ShimmerRect } from '../ShimmerRect';
import { TokenLogo } from '../TokenLogo';
import type { TokenSelectListProps } from './types';

/** The row's identity mark — the 40 every list row in the kit carries. */
const LOGO_SIZE = 40;
/** How many placeholder rows stand in while the balances load. */
const SKELETON_COUNT = 5;
/** A `ListRow` at `md` padding around a 40 logo. */
const ROW_HEIGHT = 40 + 14 * 2;

export const TokenSelectList: React.FC<TokenSelectListProps> = ({
  tokens,
  onSelectToken,
  loading,
  showBalances = true,
  verifiedOnly = true,
  onSearch,
}) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { bottomInset, standardContentBottomPadding } = useBottomSheetChrome();

  // The verified filter and the search — local, or the catalogue with `onSearch`.
  const {
    searchQuery,
    setSearchQuery,
    displayTokens: filteredTokens,
    isSearching,
  } = useTokenSelectList(tokens, { verifiedOnly, onSearch });

  const renderItem = useCallback(
    ({ item }: { item: SendToken }) => {
      const trailing = showBalances ? tokenBalanceLabel(item) : item.symbol;
      return (
        <ListRow
          testID={`send-token-row-${item.symbol}`}
          onPress={() => onSelectToken(item)}
          accessibilityLabel={`${item.name}, ${trailing}`}
          leading={<TokenLogo uri={item.logo || undefined} symbol={item.symbol} size={LOGO_SIZE} />}
          title={item.name}
          trailing={
            <Text style={styles.balance} numberOfLines={1}>
              {trailing}
            </Text>
          }
        />
      );
    },
    [onSelectToken, styles, showBalances]
  );

  const keyExtractor = useCallback((item: SendToken) => item.address, []);

  return (
    <View style={styles.container}>
      <SearchField
        testID="send-token-search-input"
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('actions.search_placeholder', 'Search...')}
      />

      {loading || isSearching ? (
        <View style={styles.list} accessibilityLabel={t('accessibility.loading_token_list')}>
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <View key={index} style={styles.skeletonRow}>
              <ShimmerRect width={LOGO_SIZE} height={LOGO_SIZE} borderRadius={LOGO_SIZE / 2} />
              <ShimmerRect width={s(120)} height={vs(16)} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredTokens}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: standardContentBottomPadding }]}
          scrollIndicatorInsets={{ bottom: bottomInset }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    // The component gap — sheet title to search, search to list, and row to
    // row — is the screen's 20. The top gap used to be a stray margin on the
    // title itself; it belongs to this container, the content below the title.
    container: {
      flex: 1,
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.screenGutter),
      gap: vs(spacing.screenGutter),
    },
    list: {
      gap: vs(spacing.screenGutter),
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.md),
      height: vs(ROW_HEIGHT),
    },
    balance: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      color: t.text.primary,
      fontVariant: [...tabularNums.native.fontVariant],
    },
  });

export default TokenSelectList;
