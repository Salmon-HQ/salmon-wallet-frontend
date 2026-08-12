import React from 'react';
import { View, FlatList, StyleSheet, ListRenderItem, RefreshControl } from 'react-native';
import TokenListItem from './TokenListItem';
import TokenListSkeleton from './TokenListSkeleton';
import { colors, spacing } from '@salmon/shared';
import type { Token } from '@salmon/shared';
import type { TokenListProps } from './types';

/**
 * Key extractor for FlatList
 */
const keyExtractor = (item: Token): string => item.address;

/**
 * TokenList component for displaying a list of cryptocurrency tokens
 *
 * Displays token information including logo, name, balance, USD value,
 * and 24-hour price change. Shows a skeleton loader while data is loading.
 *
 * @example
 * ```tsx
 * const tokens = [
 *   {
 *     address: 'So11111111111111111111111111111111111111112',
 *     name: 'Solana',
 *     symbol: 'SOL',
 *     logo: 'https://...',
 *     uiAmount: '10.5',
 *     usdBalance: 1050.00,
 *     last24HoursChange: { perc: 5.2 }
 *   },
 *   // ... more tokens
 * ];
 *
 * <TokenList
 *   tokens={tokens}
 *   loading={false}
 *   onTokenPress={(token) => navigation.navigate('TokenDetail', { token })}
 *   hiddenBalance={false}
 *   blockchain="solana"
 * />
 * ```
 */
const TokenList: React.FC<TokenListProps> = ({
  tokens,
  loading = false,
  onTokenPress,
  hiddenBalance = false,
  ListHeaderComponent,
  ListEmptyComponent,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  blockchain = 'solana',
  onScroll,
  scrollEventThrottle = 16,
}) => {
  // Render item callback - memoized for performance
  // Must be defined before any conditional returns to comply with Rules of Hooks
  const renderItem: ListRenderItem<Token> = React.useCallback(
    ({ item }) => (
      <TokenListItem
        token={item}
        onPress={onTokenPress}
        hiddenBalance={hiddenBalance}
        blockchain={blockchain}
      />
    ),
    [onTokenPress, hiddenBalance, blockchain]
  );

  // Show skeleton while loading (only when no header component is provided)
  // When header is provided, the skeleton should be shown inline
  if (loading && !ListHeaderComponent) {
    return <TokenListSkeleton count={5} />;
  }

  // Create refresh control if onRefresh is provided
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent.primary}
      colors={[colors.accent.primary]}
    />
  ) : undefined;

  // Determine empty component - show skeleton if loading with header, otherwise use provided component
  const emptyComponent = loading ? <TokenListSkeleton count={5} /> : ListEmptyComponent;

  return (
    <View style={styles.container}>
      <FlatList
        data={tokens}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={emptyComponent}
        refreshControl={refreshControl}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
});

export default TokenList;
