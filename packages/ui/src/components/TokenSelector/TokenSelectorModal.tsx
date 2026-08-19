/**
 * TokenSelectorModal Component
 *
 * A dialog component for searching and selecting tokens.
 * Displays a searchable list of tokens with pagination,
 * featured tokens section, and network chip support.
 *
 * Web version using MUI Dialog and @emotion/styled for browser extension.
 */

import React, { useCallback, type CSSProperties } from 'react';
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
import type { SvgIconProps } from '@mui/material/SvgIcon';
import { MagnifyingGlassIcon, XIcon, iconSize } from '../../icons';
import { BitcoinSvgIcon, EthereumSvgIcon } from '../Icon';
import { Thermocline } from '../Thermocline';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  componentSizes,
  fontFamily,
  fontWeight,
  getShortAddress,
  getNetworkName,
  getTokenKey,
  ContentLoader,
  Rect,
  Circle,
  fontSize,
  opacity,
  duration,
  easing,
  tabularNums,
} from '@salmon/shared';

import { useTokenSearch } from '@salmon/shared';
import type { TokenSelectorToken, TokenSelectorModalProps } from './types';

const HIDDEN_VALUE = '******';

// ============================================================================
// Styled Components
// ============================================================================

/**
 * Geometry for the modal's ground: it fills the paper and sits behind
 * everything the modal holds. The paper's `overflow: hidden` clips the
 * material to the modal's corners, so the ground needs no radius of its own.
 */
const GROUND_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
};

/**
 * The modal's sections sit above the ground. They have to be positioned to do
 * it: the material is an absolutely positioned layer, and an unpositioned
 * sibling paints beneath one whatever its z-index says.
 */
const ABOVE_GROUND = {
  position: 'relative' as const,
  zIndex: 1,
};

const StyledDialog = styled(Dialog)({
  '& .MuiDialog-paper': {
    // The paper carries no fill of its own: the modal's ground is the material
    // mounted inside it, and an opaque fill — or MUI's dark-mode elevation
    // overlay, which is a background image — would paint over it. The radius,
    // the border and the clip stay, so the material follows the modal's
    // corners. See DESIGN.md §The thermocline is the sheet material.
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    borderRadius: borderRadius.xl,
    border: `${borderWidth.thin}px solid ${colors.border.default}`,
    minWidth: `min(${componentSizes.sheetWidthSm}px, 95vw)`,
    maxWidth: `min(${componentSizes.sheetWidthLg}px, 95vw)`,
    maxHeight: '85vh',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
});

const StyledDialogTitle = styled(DialogTitle)({
  ...ABOVE_GROUND,
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
  ...ABOVE_GROUND,
  padding: `${spacing.md}px ${spacing.xl}px`,
});

const SearchInput = styled(InputBase)({
  width: '100%',
  backgroundColor: colors.input.background,
  borderRadius: borderRadius.lg,
  padding: `${spacing.sm}px ${spacing.md}px`,
  color: colors.text.primary,
  fontSize: fontSize.bodyLg,
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

const SearchIconStyled = styled(MagnifyingGlassIcon)({
  color: colors.text.secondary,
  marginRight: spacing.sm,
  width: iconSize.md,
  height: iconSize.md,
});

const StyledDialogContent = styled(DialogContent)({
  ...ABOVE_GROUND,
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
  fontSize: fontSize.bodyLg,
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
  fontSize: fontSize.bodyLg,
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

const ChainMark = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginLeft: spacing.sm,
});

const TokenBalance = styled(Typography)({
  ...tabularNums.css,
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
  fontSize: fontSize.bodyLg,
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
  fontSize: fontSize.bodyLg,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
});

const FooterContainer = styled(Box)({
  ...ABOVE_GROUND,
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
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  '&:hover': {
    backgroundColor: colors.button.dangerHover,
  },
});

// ============================================================================
// Chain identity
// ============================================================================

// DESIGN.md, §Chain identity. Mainnet is the silent default: Solana rows carry
// nothing (in a Solana-first wallet a badge on every row says "you are where
// you always are"), and a non-Solana mainnet token gets only its quiet chain
// mark — the brand's own glyph, the same one BalanceCard and DerivedAccountCard
// draw, never a redrawn interface icon. Anything that is NOT mainnet keeps the
// loud text chip, so a devnet or testnet token can never be mistaken for the
// real thing; the chip stays a machine identifier and is deliberately not
// translated.
const CHAIN_MARKS: Record<string, React.ComponentType<SvgIconProps>> = {
  bitcoin: BitcoinSvgIcon,
  ethereum: EthereumSvgIcon,
};

const CHAIN_MARK_SIZE = componentSizes.iconSizeXxsm;

const chainMarkStyle = {
  fontSize: CHAIN_MARK_SIZE,
  width: CHAIN_MARK_SIZE,
  height: CHAIN_MARK_SIZE,
  color: colors.text.tertiary,
};

const NetworkIdentity: React.FC<{ network: string }> = ({ network }) => {
  // Network values arrive either as canonical ids ('bitcoin-mainnet',
  // 'solana-devnet') or as bare chain names ('Bitcoin') from the swap logic's
  // chain fallback; a bare chain name carries no environment, so it counts as
  // mainnet.
  const [chain, env] = network.toLowerCase().split('-');
  if (env && env !== 'mainnet') {
    return (
      <NetworkChip data-testid="network-chip">
        <NetworkChipText>{network.toUpperCase()}</NetworkChipText>
      </NetworkChip>
    );
  }
  const Mark = CHAIN_MARKS[chain];
  if (!Mark) return null;
  return (
    <ChainMark data-testid={`chain-mark-${chain}`}>
      <Mark style={chainMarkStyle} />
    </ChainMark>
  );
};

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
  showBalances = true,
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
      {/* A modal is the DOM's sheet, and the thermocline is what a sheet is
          made of: this one grounds on the thick tier instead of an opaque
          fill. Its texture is the membrane field, one dark scales layer the
          material mounts itself. See DESIGN.md §The thermocline is the sheet
          material and §The membrane field. Ground first: every section below
          is positioned above it, so the material stays behind everything the
          modal holds. */}
      <Thermocline tier="thick" style={GROUND_STYLE} />

      {/* Header */}
      <StyledDialogTitle id="token-selector-title">
        <TitleText>{t('wallet.select_token', 'Select Token')}</TitleText>
        <CloseButton onClick={handleClose} aria-label={t('general.close', 'Close')}>
          <XIcon />
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
            <CircularProgress
              size={componentSizes.iconSizeXs}
              sx={{ color: colors.text.secondary }}
            />
            <SearchingText>{t('actions.searching', 'Searching...')}</SearchingText>
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
                aria-label={t('accessibility.select_token', 'Select {{name}}', {
                  name: token.symbol || token.name,
                })}
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
              <TokenItemContainer
                key={i}
                sx={{ cursor: 'default', '&:hover': { backgroundColor: colors.background.card } }}
              >
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
          ) : isError && !isSearching ? (
            <EmptyContainer data-testid="token-search-error">
              <EmptyText>{t('wallet.token_search_failed')}</EmptyText>
              <LoadMoreButton onClick={retry} data-testid="token-search-retry-button">
                {t('transactions.tapToRetry')}
              </LoadMoreButton>
            </EmptyContainer>
          ) : paginatedTokens.length === 0 && !isSearching ? (
            <EmptyContainer>
              <EmptyText>{t('wallet.no_tokens_found', 'No tokens found')}</EmptyText>
            </EmptyContainer>
          ) : (
            paginatedTokens.map((token) => {
              const tokenName = token.name || getShortAddress(token.mint || token.address, 4) || '';
              // With balances hidden the right column falls back to the symbol
              // alone — identity stays, holdings go.
              const balanceText =
                showBalances && token.uiAmount
                  ? `${hiddenBalance ? HIDDEN_VALUE : token.uiAmount} ${token.symbol || ''}`
                  : token.symbol || '';

              return (
                <TokenItemContainer
                  key={getTokenKey(token)}
                  onClick={() => handleSelect(token)}
                  role="button"
                  // DESIGN.md, §Chain identity: the visual channel may stay
                  // quiet, the announced one never does — the label speaks the
                  // full human network whatever the row happens to draw.
                  aria-label={
                    token.network
                      ? t(
                          'accessibility.select_token_on_network',
                          'Select {{name}} on {{network}}',
                          {
                            name: tokenName,
                            network: getNetworkName(token.network),
                          }
                        )
                      : t('accessibility.select_token', 'Select {{name}}', {
                          name: tokenName,
                        })
                  }
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
                    <TokenIconPlaceholder>{token.symbol?.[0] || '?'}</TokenIconPlaceholder>
                  )}

                  {/* Token Info */}
                  <TokenInfo>
                    <TokenNameRow>
                      <TokenName>{tokenName}</TokenName>
                      {showNetworkChip && token.network && (
                        <NetworkIdentity network={token.network} />
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
        <CloseActionButton onClick={handleClose}>{t('actions.close', 'Close')}</CloseActionButton>
      </FooterContainer>
    </StyledDialog>
  );
}
