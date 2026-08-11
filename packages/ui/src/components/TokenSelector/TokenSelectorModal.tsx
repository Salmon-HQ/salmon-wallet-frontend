/**
 * TokenSelectorModal Component
 *
 * A dialog component for searching and selecting tokens.
 * Displays a searchable list of tokens with pagination,
 * featured tokens section, and network chip support.
 *
 * Web version using MUI Dialog and @emotion/styled for browser extension.
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  componentSizes,
  fontFamily,
  fontWeight,
  getShortAddress,
  getTokenKey,
  ContentLoader,
  Rect,
  Circle,
  fontSize,
  opacity,
  duration,
  easing,
} from '@salmon/shared';

import { useTokenSearch } from '@salmon/shared';
import type { TokenSelectorToken, TokenSelectorModalProps } from './types';

const HIDDEN_VALUE = '******';

// ============================================================================
// Styled Components
// ============================================================================

const StyledDialog = styled(Dialog)({
  '& .MuiDialog-paper': {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    border: `${borderWidth.thin}px solid ${colors.border.default}`,
    minWidth: `min(${componentSizes.sheetWidthSm}px, 95vw)`,
    maxWidth: `min(${componentSizes.sheetWidthLg}px, 95vw)`,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
  },
});

const StyledDialogTitle = styled(DialogTitle)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${spacing.lg}px ${spacing.xl}px`,
  borderBottom: `${borderWidth.thin}px solid ${colors.border.default}`,
});

const TitleText = styled(Typography)({
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  flex: 1,
  textAlign: 'center',
});

const CloseButton = styled(IconButton)({
  color: colors.text.secondary,
  padding: spacing.xs,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

const SearchContainer = styled(Box)({
  padding: `${spacing.md}px ${spacing.xl}px`,
});

const SearchInput = styled(InputBase)({
  width: '100%',
  backgroundColor: colors.input.background,
  borderRadius: borderRadius.lg,
  padding: `${spacing.sm}px ${spacing.md}px`,
  color: colors.text.primary,
  fontSize: fontSize.md,
  fontFamily: fontFamily.sans,
  border: `${borderWidth.thin}px solid ${colors.input.border}`,
  transition: `border-color ${duration.normal} ${easing.ease}`,
  '&.Mui-focused': {
    borderColor: colors.accent.primary,
  },
  '& .MuiInputBase-input::placeholder': {
    color: colors.text.tertiary,
    opacity: opacity.full,
  },
});

const SearchIconStyled = styled(SearchIcon)({
  color: colors.text.secondary,
  marginRight: spacing.sm,
  fontSize: fontSize.xl,
});

const StyledDialogContent = styled(DialogContent)({
  padding: 0,
  overflowY: 'auto',
  flex: 1,
});

const TokenListContainer = styled(Box)({
  padding: `0 ${spacing.xl}px ${spacing.lg}px`,
});

const TokenItemContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.lg,
  padding: `${spacing.md}px`,
  marginBottom: spacing.sm,
  cursor: 'pointer',
  transition: `background-color ${duration.normal} ${easing.ease}`,
  '&:hover': {
    backgroundColor: colors.background.tertiary,
  },
});

const TokenIconImage = styled('img')({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: borderRadius.iconLg,
  backgroundColor: colors.card.border,
  objectFit: 'cover',
});

const TokenIconPlaceholder = styled(Box)({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: borderRadius.iconLg,
  backgroundColor: colors.card.border,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: fontSize.md,
  color: colors.text.secondary,
});

const TokenInfo = styled(Box)({
  flex: 1,
  marginLeft: spacing.md,
  minWidth: 0,
});

const TokenNameRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
});

const TokenName = styled(Typography)({
  fontSize: fontSize.md,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
});

const NetworkChip = styled(Box)({
  backgroundColor: colors.card.border,
  borderRadius: borderRadius.sm,
  padding: `${spacing.xxs}px ${spacing.xs}px`,
  marginLeft: spacing.sm,
});

const NetworkChipText = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  textTransform: 'uppercase',
});

const TokenBalance = styled(Typography)({
  fontSize: fontSize.base,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  marginTop: spacing.xxs,
});

const FeaturedContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-around',
  padding: `${spacing.lg}px ${spacing.xl}px`,
  marginBottom: spacing.sm,
});

const FeaturedTokenButton = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: spacing.sm,
  cursor: 'pointer',
  borderRadius: borderRadius.md,
  transition: `background-color ${duration.normal} ${easing.ease}`,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

const FeaturedTokenIcon = styled('img')({
  width: componentSizes.iconSize3XL,
  height: componentSizes.iconSize3XL,
  borderRadius: borderRadius['2xl'],
  backgroundColor: colors.card.border,
  objectFit: 'cover',
});

const FeaturedTokenIconPlaceholder = styled(Box)({
  width: componentSizes.iconSize3XL,
  height: componentSizes.iconSize3XL,
  borderRadius: borderRadius['2xl'],
  backgroundColor: colors.card.border,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: fontSize.xl,
  color: colors.text.secondary,
});

const DisclaimerContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing.sm}px ${spacing.xl}px`,
});

const DisclaimerText = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  textAlign: 'center',
});

const SearchingContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing.md}px ${spacing.xl}px`,
});

const SearchingText = styled(Typography)({
  fontSize: fontSize.base,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  marginLeft: spacing.sm,
});

const LoadMoreButton = styled(Button)({
  width: '100%',
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.lg,
  padding: `${spacing.md}px`,
  textTransform: 'none',
  color: colors.text.primary,
  fontSize: fontSize.md,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  marginTop: spacing.sm,
  '&:hover': {
    backgroundColor: colors.background.tertiary,
  },
});

const EmptyContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing['2xl']}px ${spacing.xl}px`,
});

const EmptyText = styled(Typography)({
  fontSize: fontSize.md,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
});

const FooterContainer = styled(Box)({
  padding: `${spacing.md}px ${spacing.xl}px`,
  borderTop: `${borderWidth.thin}px solid ${colors.border.default}`,
});

const CloseActionButton = styled(Button)({
  width: '100%',
  backgroundColor: colors.accent.primary,
  borderRadius: borderRadius.lg,
  padding: `${spacing.md}px`,
  textTransform: 'none',
  color: colors.text.primary,
  fontSize: fontSize.md,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  '&:hover': {
    backgroundColor: colors.button.dangerHover,
  },
});

// ============================================================================
// TokenSelectorModal Component
// ============================================================================

/**
 * Modal dialog component for searching and selecting tokens.
 *
 * Features:
 * - Search with debounce (local + async external)
 * - Featured tokens section at the top
 * - Paginated token list with "View More" button
 * - Network chip display per token
 * - Verified tokens disclaimer
 * - Hidden balance mode
 *
 * @example
 * ```tsx
 * <TokenSelectorModal
 *   visible={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   tokens={userTokens}
 *   featuredTokens={[solToken, usdcToken]}
 *   onSelect={handleTokenSelect}
 *   onSearch={searchTokens}
 * />
 * ```
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

  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    paginatedTokens,
    hasMore,
    loadMore,
    reset,
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

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    [setSearchQuery]
  );

  return (
    <StyledDialog
      open={visible}
      onClose={handleClose}
      aria-labelledby="token-selector-title"
      disableEnforceFocus
    >
      {/* Header */}
      <StyledDialogTitle id="token-selector-title">
        <TitleText>
          {t('wallet.select_token', 'Select Token')}
        </TitleText>
        <CloseButton onClick={handleClose} aria-label={t('general.close', 'Close')}>
          <CloseIcon />
        </CloseButton>
      </StyledDialogTitle>

      {/* Search Input */}
      <SearchContainer>
        <SearchInput
          placeholder={t('actions.search_placeholder', 'Search tokens...')}
          value={searchQuery}
          onChange={handleSearchChange}
          startAdornment={<SearchIconStyled />}
          autoComplete="off"
          inputProps={{
            autoCapitalize: 'none',
            autoCorrect: 'off',
          }}
        />
      </SearchContainer>

      {/* Content */}
      <StyledDialogContent>
        {/* Verified Disclaimer */}
        {showVerifiedDisclaimer && searchQuery.length < 3 && (
          <DisclaimerContainer>
            <DisclaimerText>
              {t('swap.showing_verified_tokens', 'Showing verified tokens only')}
            </DisclaimerText>
          </DisclaimerContainer>
        )}

        {/* Searching Indicator */}
        {isSearching && (
          <SearchingContainer>
            <CircularProgress size={componentSizes.iconSizeXs} sx={{ color: colors.text.secondary }} />
            <SearchingText>
              {t('actions.searching', 'Searching...')}
            </SearchingText>
          </SearchingContainer>
        )}

        {/* Featured Tokens */}
        {featuredTokens && featuredTokens.length > 0 && searchQuery.length < 3 && (
          <FeaturedContainer>
            {featuredTokens.map((token) => (
              <FeaturedTokenButton
                key={getTokenKey(token)}
                onClick={() => handleSelect(token)}
                role="button"
                aria-label={t('accessibility.select_token', 'Select {{name}}', { name: token.symbol || token.name })}
                data-testid={`token-select-featured-${token.symbol || token.name}`}
              >
                {token.logo ? (
                  <FeaturedTokenIcon
                    src={token.logo}
                    alt={token.symbol || token.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <FeaturedTokenIconPlaceholder>
                    {token.symbol?.[0] || '?'}
                  </FeaturedTokenIconPlaceholder>
                )}
              </FeaturedTokenButton>
            ))}
          </FeaturedContainer>
        )}

        {/* Token List */}
        <TokenListContainer>
          {loading ? (
            Array.from({ length: 5 }, (_, i) => (
              <TokenItemContainer key={i} sx={{ cursor: 'default', '&:hover': { backgroundColor: colors.background.card } }}>
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
              </TokenItemContainer>
            ))
          ) : paginatedTokens.length === 0 && !isSearching ? (
            <EmptyContainer>
              <EmptyText>
                {t('wallet.no_tokens_found', 'No tokens found')}
              </EmptyText>
            </EmptyContainer>
          ) : (
            paginatedTokens.map((token) => {
              const tokenName = token.name || getShortAddress(token.mint || token.address, 4) || '';
              const balanceText = token.uiAmount
                ? `${hiddenBalance ? HIDDEN_VALUE : token.uiAmount} ${token.symbol || ''}`
                : token.symbol || '';

              return (
                <TokenItemContainer
                  key={getTokenKey(token)}
                  onClick={() => handleSelect(token)}
                  role="button"
                  aria-label={t('accessibility.select_token', 'Select {{name}}', { name: tokenName })}
                  data-testid={`token-select-${token.symbol || tokenName}`}
                >
                  {/* Token Icon */}
                  {token.logo ? (
                    <TokenIconImage
                      src={token.logo}
                      alt={tokenName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <TokenIconPlaceholder>
                      {token.symbol?.[0] || '?'}
                    </TokenIconPlaceholder>
                  )}

                  {/* Token Info */}
                  <TokenInfo>
                    <TokenNameRow>
                      <TokenName>{tokenName}</TokenName>
                      {showNetworkChip && token.network && (
                        <NetworkChip>
                          <NetworkChipText>
                            {token.network.toUpperCase()}
                          </NetworkChipText>
                        </NetworkChip>
                      )}
                    </TokenNameRow>
                    <TokenBalance>{balanceText}</TokenBalance>
                  </TokenInfo>

                </TokenItemContainer>
              );
            })
          )}

          {/* Load More */}
          {hasMore && (
            <LoadMoreButton onClick={loadMore}>
              {t('actions.view_more', 'View More')}
            </LoadMoreButton>
          )}
        </TokenListContainer>
      </StyledDialogContent>

      {/* Footer */}
      <FooterContainer>
        <CloseActionButton onClick={handleClose}>
          {t('actions.close', 'Close')}
        </CloseActionButton>
      </FooterContainer>
    </StyledDialog>
  );
}

