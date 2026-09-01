/**
 * TokenSelectList — the send flow's token picker, one pick per opening.
 *
 * Composed from the kit the rest of the redesign is drawn with: the
 * `SearchField` pill, then a `ListRow` per token (its logo, its name, its
 * balance), 20 between every sibling per DESIGN.md's component gap. The
 * "Select Token" heading is the sheet's own title, drawn by the container.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  fontFamilyNative,
  fontSize,
  formatTokenAmount,
  lineHeight,
  s,
  semantic,
  spacing,
  tabularNums,
  vs,
} from '@salmon/shared';
import type { SendToken, StepTokenSelectProps } from '@salmon/shared';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { ListRow } from '../ListRow';
import { SearchField } from '../SearchField';
import { ShimmerRect } from '../ShimmerRect';
import { TokenLogo } from '../TokenLogo';

/** The row's identity mark — the 40 every list row in the kit carries. */
const LOGO_SIZE = 40;
/** How many placeholder rows stand in while the balances load. */
const SKELETON_COUNT = 5;
/** A `ListRow` at `md` padding around a 40 logo. */
const ROW_HEIGHT = 40 + 14 * 2;

function balanceLabel(token: SendToken): string {
  const amount = typeof token.uiAmount === 'string' ? parseFloat(token.uiAmount) : token.uiAmount;
  if (amount === 0) return `0 ${token.symbol}`;
  // The floor reads in the app's language too — a hardcoded '<0.0001' put an
  // English decimal point next to a Spanish one in the row below it.
  if (amount < 0.0001) return `<${formatTokenAmount(0.0001)} ${token.symbol}`;
  return `${formatTokenAmount(amount)} ${token.symbol}`;
}

export const TokenSelectList: React.FC<StepTokenSelectProps> = ({
  tokens,
  onSelectToken,
  showUnverifiedTokens,
  loading,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { bottomInset, standardContentBottomPadding } = useBottomSheetChrome();

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

  const renderItem = useCallback(
    ({ item }: { item: SendToken }) => {
      const balance = balanceLabel(item);
      return (
        <ListRow
          testID={`send-token-row-${item.symbol}`}
          onPress={() => onSelectToken(item)}
          accessibilityLabel={`${item.name}, ${balance}`}
          leading={<TokenLogo uri={item.logo || undefined} symbol={item.symbol} size={LOGO_SIZE} />}
          title={item.name}
          trailing={
            <Text style={styles.balance} numberOfLines={1}>
              {balance}
            </Text>
          }
        />
      );
    },
    [onSelectToken]
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

      {loading ? (
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

const styles = StyleSheet.create({
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
    color: semantic.text.primary,
    fontVariant: [...tabularNums.native.fontVariant],
  },
});

export default TokenSelectList;
