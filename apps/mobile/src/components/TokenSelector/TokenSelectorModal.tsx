import React, { useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
  type ListRenderItem,
} from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useTokenSearch,
  colors,
  spacing,
  borderRadius,
  ContentLoader,
  Rect,
  Circle,
  getShortAddress,
  getTokenKey,
  fontFamilyNative,
  fontSize,
  fontWeight,
} from '@salmon/shared';
import { BlurContainer, BlurTargetProvider } from '../BlurContainer';
import { ScalesBackground } from '../ScalesBackground';
import { TokenLogo } from '../TokenLogo';
import type { TokenSelectorToken, TokenSelectorModalProps } from './types';

const HIDDEN_VALUE = '******';

/**
 * Modal component for selecting tokens
 */
export function TokenSelectorModal({
  visible,
  onClose,
  tokens,
  featuredTokens,
  onSelect,
  onSearch,
  hiddenBalance = false,
  showNetworkChip = false,
  showVerifiedDisclaimer = false,
  loading = false,
}: TokenSelectorModalProps): React.ReactElement {
  const { t } = useTranslation();
  const blurTargetRef = useRef<View>(null);

  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    paginatedTokens,
    hasMore,
    loadMore,
    reset,
    retry,
    isError,
  } = useTokenSearch(tokens, onSearch);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSelect = useCallback(
    (token: TokenSelectorToken) => {
      onSelect(token);
      reset();
    },
    [onSelect, reset]
  );

  const renderTokenItem: ListRenderItem<TokenSelectorToken> = useCallback(
    ({ item: token }) => {
      const tokenName = token.name || getShortAddress(token.mint || token.address);
      const balanceText = token.uiAmount
        ? `${hiddenBalance ? HIDDEN_VALUE : token.uiAmount} ${token.symbol || ''}`
        : token.symbol || '';

      return (
        <BlurContainer style={styles.tokenItemShell} backgroundColor={colors.background.tokenItem}>
          <TouchableOpacity
            testID={`token-row-${token.symbol}`}
            accessibilityRole="button"
            accessibilityLabel={`${tokenName}${token.network ? ` ${token.network}` : ''}`}
            style={styles.tokenItem}
            onPress={() => handleSelect(token)}
            activeOpacity={0.7}
          >
            <View style={styles.tokenIconContainer}>
              <TokenLogo uri={token.logo || undefined} symbol={token.symbol} size={40} />
            </View>
            <View style={styles.tokenInfo}>
              <View style={styles.tokenNameRow}>
                <View style={styles.tokenNameContainer}>
                  <Text style={styles.tokenName} numberOfLines={1}>
                    {tokenName}
                  </Text>
                </View>
                {showNetworkChip && token.network && (
                  <View style={styles.networkChip}>
                    <Text style={styles.networkChipText}>{token.network.toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.tokenBalance} numberOfLines={1}>
                {balanceText}
              </Text>
            </View>
          </TouchableOpacity>
        </BlurContainer>
      );
    },
    [handleSelect, hiddenBalance, showNetworkChip]
  );

  const renderFeaturedTokens = useCallback(() => {
    if (!featuredTokens || featuredTokens.length === 0 || searchQuery.length >= 3) {
      return null;
    }

    return (
      <View style={styles.featuredContainer}>
        {featuredTokens.map((token) => (
          <TouchableOpacity
            key={getTokenKey(token)}
            style={styles.featuredToken}
            onPress={() => handleSelect(token)}
            activeOpacity={0.7}
          >
            <TokenLogo uri={token.logo || undefined} symbol={token.symbol} size={48} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [featuredTokens, searchQuery, handleSelect]);

  const renderHeader = useCallback(() => {
    return (
      <View>
        {showVerifiedDisclaimer && searchQuery.length < 3 && (
          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerText}>
              {t('swap.showing_verified_tokens', 'Showing verified tokens only')}
            </Text>
          </View>
        )}
        {isSearching && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color={colors.text.secondary} />
            <Text style={styles.searchingText}>{t('actions.searching', 'Searching...')}</Text>
          </View>
        )}
        {renderFeaturedTokens()}
      </View>
    );
  }, [showVerifiedDisclaimer, searchQuery, isSearching, t, renderFeaturedTokens]);

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;

    return (
      <BlurContainer style={styles.loadMoreButton} backgroundColor={colors.background.tokenItem}>
        <TouchableOpacity style={styles.loadMoreButtonInner} onPress={loadMore}>
          <Text style={styles.loadMoreText}>{t('actions.view_more', 'View More')}</Text>
        </TouchableOpacity>
      </BlurContainer>
    );
  }, [hasMore, loadMore, t]);

  const renderEmpty = useCallback(() => {
    if (isSearching) return null;

    if (isError) {
      return (
        <View style={styles.emptyContainer} testID="token-search-error">
          <Text style={styles.emptyText}>{t('wallet.token_search_failed')}</Text>
          <TouchableOpacity
            onPress={retry}
            activeOpacity={0.7}
            testID="token-search-retry-button"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>{t('transactions.tapToRetry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('wallet.no_tokens_found', 'No tokens found')}</Text>
      </View>
    );
  }, [isSearching, isError, retry, t]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.modalRoot}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill}>
          <View style={styles.backgroundBase} />
          <ScalesBackground />
        </BlurTargetView>

        <BlurTargetProvider value={blurTargetRef}>
          <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>{t('wallet.select_token', 'Select Token')}</Text>
              </View>

              <BlurContainer
                style={styles.searchContainer}
                backgroundColor={colors.background.tokenItem}
              >
                <TextInput
                  testID="token-search-input"
                  style={styles.searchInput}
                  placeholder={t('actions.search_placeholder', 'Search tokens...')}
                  placeholderTextColor={colors.text.tertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </BlurContainer>

              {loading ? (
                <View style={styles.skeletonContainer}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <BlurContainer
                      key={i}
                      style={styles.tokenItemShell}
                      backgroundColor={colors.background.tokenItem}
                    >
                      <View style={styles.tokenItem}>
                        <ContentLoader
                          speed={1.5}
                          width={320}
                          height={40}
                          viewBox="0 0 320 40"
                          backgroundColor={colors.skeleton.base}
                          foregroundColor={colors.skeleton.highlight}
                        >
                          <Circle cx="20" cy="20" r="20" />
                          <Rect x="52" y="4" rx="4" ry="4" width="100" height="14" />
                          <Rect x="52" y="24" rx="4" ry="4" width="140" height="12" />
                        </ContentLoader>
                      </View>
                    </BlurContainer>
                  ))}
                </View>
              ) : (
                <FlatList
                  data={paginatedTokens}
                  keyExtractor={getTokenKey}
                  renderItem={renderTokenItem}
                  ListHeaderComponent={renderHeader}
                  ListFooterComponent={renderFooter}
                  ListEmptyComponent={renderEmpty}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  // Without this, a tap on a result while the search input still
                  // holds focus is spent dismissing the keyboard instead of
                  // selecting the token, so searching always costs two taps.
                  keyboardShouldPersistTaps="handled"
                  style={styles.list}
                />
              )}

              <View style={styles.footer}>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Text style={styles.closeButtonText}>{t('actions.close', 'Close')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </BlurTargetProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.sheet.backdrop,
  },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  searchContainer: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  searchInput: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontSize: fontSize.md,
  },
  skeletonContainer: {
    paddingTop: spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  tokenItemShell: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  tokenIconContainer: {
    marginRight: spacing.md,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenNameContainer: {
    flex: 1,
  },
  tokenName: {
    color: colors.text.primary,
    fontSize: fontSize.md,
    fontFamily: fontFamilyNative.medium,
    fontWeight: fontWeight.medium,
  },
  tokenBalance: {
    color: colors.text.secondary,
    fontSize: fontSize.base,
    marginTop: spacing.xxs,
  },
  networkChip: {
    backgroundColor: `${colors.border.default}CC`,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: spacing.xxs,
    marginLeft: spacing.sm,
  },
  networkChipText: {
    color: colors.text.secondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
  },
  featuredContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  featuredToken: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  disclaimerContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  disclaimerText: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  searchingText: {
    color: colors.text.secondary,
    fontSize: fontSize.base,
    marginLeft: spacing.sm,
  },
  loadMoreButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  loadMoreButtonInner: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  loadMoreText: {
    color: colors.text.primary,
    fontSize: fontSize.md,
    fontFamily: fontFamilyNative.medium,
    fontWeight: fontWeight.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: fontSize.md,
  },
  retryText: {
    color: colors.accent.primary,
    fontSize: fontSize.md,
    fontFamily: fontFamilyNative.medium,
    fontWeight: fontWeight.medium,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  footer: {
    paddingVertical: spacing.md,
  },
  closeButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.text.primary,
    fontSize: fontSize.md,
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
  },
});
