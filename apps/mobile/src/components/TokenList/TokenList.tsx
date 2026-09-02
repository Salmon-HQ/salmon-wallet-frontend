import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, FlatList, StyleSheet, ListRenderItem, RefreshControl } from 'react-native';
import TokenListItem from './TokenListItem';
import { SkeletonRow } from '../Skeleton';
import { spacing } from '@salmon/shared';
import type { Token } from '@salmon/shared';
import type { TokenListProps } from './types';
import { useSemantic } from '../../theme/useThemedStyles';

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
  onRefresh,
  contentContainerStyle,
  blockchain = 'solana',
  onScroll,
  scrollEventThrottle = 16,
}) => {
  const { t } = useTranslation();
  const { accent } = useSemantic();

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

  // The pull's own state — see the refresh control below for why it is not the
  // caller's. Declared before any conditional return to comply with the Rules
  // of Hooks. `mounted` guards the late resolution of a refresh whose list has
  // already gone (a chain switch swaps this component out mid-request).
  const [pulling, setPulling] = React.useState(false);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handlePull = React.useCallback(() => {
    if (!onRefresh) return;
    setPulling(true);
    Promise.resolve(onRefresh()).finally(() => {
      if (mounted.current) setPulling(false);
    });
  }, [onRefresh]);

  // Create refresh control if onRefresh is provided.
  //
  // The control answers the pull and nothing else. It used to be driven by the
  // caller's background-fetch flag, which meant any refetch the app started on
  // its own — a post-transaction settle, a focus revalidation — raised the
  // control over a list nobody had pulled, and raised it while the screen was
  // off-screen, where the native control has no gesture to hand it back to. The
  // pull owns its own state here, so the affordance can only appear for the
  // gesture that asked for it. Cached rows stay on screen throughout: a quiet
  // background refresh is quiet, per the `refreshing` contract in `useBalance`.
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={pulling}
      onRefresh={handlePull}
      tintColor={accent.ink}
      colors={[accent.ink]}
    />
  ) : undefined;

  // The skeleton is the list's own empty state, never a sibling rendered
  // outside it: a skeleton outside the FlatList never receives the
  // `contentContainerStyle` the host passes, so it ran edge to edge while the
  // rows it stood in for kept the screen gutter (owner, on device).
  const emptyComponent = loading ? (
    <SkeletonRow
      padding="lg"
      leadingSize={44}
      trailingWidth={64}
      count={5}
      accessibilityLabel={t('accessibility.loading_token_info', 'Loading token information')}
    />
  ) : (
    ListEmptyComponent
  );

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
