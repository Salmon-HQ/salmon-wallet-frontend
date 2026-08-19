/**
 * BalanceCard - Portfolio balance display with gradient background
 *
 * Web version matching mobile's visual structure:
 * - Dynamic gradient per blockchain
 * - Centered blockchain SVG icon
 * - Balance with decimal opacity split
 * - Trending arrow + change colors from tokens
 *
 * Uses responsive scaling (s, vs, ms) from shared to match mobile proportions.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keyframes } from '@mui/material/styles';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  gradients,
  semantic,
  spacing,
  borderRadius,
  fontSize,
  fontFamily,
  fontWeight,
  letterSpacing,
  lineHeight,
  componentSizes,
  shadowsCSS,
  s,
  vs,
  ms,
  formatPercentage,
  getLabelValue,
  hiddenValue,
  useCurrencyContext,
  getNetworkLabel,
  opacity,
  durationMs,
  easing,
  motionMs,
  motionDuration,
  motionEasing,
  reducedMotion,
  resolveMotionMs,
  tabularNums,
} from '@salmon/shared';
import type { BlockchainId } from '@salmon/shared';
import { EyeIcon, EyeOffIcon, Icon, SolanaSvgIcon, BitcoinSvgIcon, EthereumSvgIcon } from '../Icon';
import { useReducedMotion } from '../../utils/useReducedMotion';
import type { BalanceCardProps } from './types';

/**
 * Get CSS gradient string for a blockchain
 */
const getGradientCSSForBlockchain = (blockchain: BlockchainId): string => {
  switch (blockchain) {
    case 'solana':
      return gradients.balanceCardSolanaCSS;
    case 'solana-devnet':
      return gradients.balanceCardSolanaDevnetCSS;
    case 'bitcoin':
      return gradients.balanceCardBitcoinCSS;
    case 'bitcoin-testnet':
      return gradients.balanceCardBitcoinTestnetCSS;
    case 'ethereum':
      return gradients.balanceCardEthereumCSS;
    case 'ethereum-sepolia':
      return gradients.balanceCardEthereumSepoliaCSS;
    default:
      return gradients.balanceCardSolanaCSS;
  }
};

/**
 * Render the blockchain logo using SVG icons
 */
const renderBlockchainLogo = (blockchain: BlockchainId) => {
  const iconSize = s(componentSizes.blockchainIcon);
  const iconStyle = {
    width: iconSize,
    height: iconSize,
    color: colors.text.primary,
  };
  switch (blockchain) {
    case 'solana':
    case 'solana-devnet':
      return <SolanaSvgIcon style={iconStyle} />;
    case 'bitcoin':
    case 'bitcoin-testnet':
      return <BitcoinSvgIcon style={iconStyle} />;
    case 'ethereum':
    case 'ethereum-sepolia':
      return <EthereumSvgIcon style={iconStyle} />;
    default:
      return <SolanaSvgIcon style={iconStyle} />;
  }
};

// --- Styled components ---

/**
 * The card is full-bleed on purpose: flush to the header, spanning the panel,
 * radius closed only where it leaves the header. In a narrow side panel a
 * hero that touches both edges carries more authority than an inset one, and
 * an inset card with its own 1px edge would put a bordered card inside a
 * column of bordered token rows — cards within cards.
 *
 * So the plane is separated by material, not by an outline: the E2 trio does
 * the work. `rimHighlight` is the lit top edge that now reads the header/card
 * seam on its own, `rimShade` is the underside, and `cardAmbient` is a real
 * offset shadow that puts the card off the ground. No hue, no border.
 */
const Container = styled(Box)({
  borderRadius: `0 0 ${ms(borderRadius.card)}px ${ms(borderRadius.card)}px`,
  paddingTop: vs(spacing['2xl']),
  paddingBottom: vs(spacing['2xl']),
  paddingLeft: s(spacing['2xl']),
  paddingRight: s(spacing['2xl']),
  position: 'relative',
  overflow: 'hidden',
  boxShadow: `${shadowsCSS.cardAmbient}, ${shadowsCSS.rimHighlight}, ${shadowsCSS.rimShade}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vs(spacing.sm),
});

const ContentGroup = styled(Box)({
  position: 'relative' as const,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vs(spacing.xs),
});

/**
 * The printed face of the card: everything that belongs to one chain, and the
 * only thing that transitions when the chain changes. It reproduces the
 * container's own column so wrapping the groups changes no spacing.
 */
const ChainFace = styled(Box)<{ $visible: boolean }>(({ $visible }) => ({
  alignSelf: 'stretch',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vs(spacing.sm),
  opacity: $visible ? 1 : 0,
  transition: `opacity ${motionDuration.flick} ${
    $visible ? motionEasing.current.css : motionEasing.sink.css
  }`,
}));

/**
 * Group 1, and the only place on this card the scales are allowed.
 *
 * It stretches to the card's full width so the motif reads as a band rather
 * than a patch, and it is the *structural* guarantee behind the exclusion
 * rule: the field is a child of this group at `height: 100%`, so it can only
 * ever occupy the logo/badge region. The card's `gap` then puts clear space
 * between this group's bottom edge — where the fade mask has already reached
 * alpha 0 — and the balance figure below. If the logo ever resizes, the band
 * resizes with it; there is no measured constant to fall out of date.
 */
const LogoGroup = styled(ContentGroup)({
  alignSelf: 'stretch',
  position: 'relative',
});

const LogoContainer = styled(Box)({
  position: 'relative' as const,
  zIndex: 1,
  width: s(componentSizes.logoContainer),
  height: vs(componentSizes.logoContainer),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

/**
 * The network badge. Now that the card's background carries no chain hue,
 * this is one of the two places chain identity lives (the other is the logo
 * above it) — so it is an *opaque* badge with a real border rather than a
 * 30%-black wash, which is a channel that survives a colorblind user, a
 * narrow column, and a screenshot.
 */
const NetworkLabel = styled(Box)<{ $visible?: boolean }>(({ $visible = true }) => ({
  position: 'relative' as const,
  zIndex: 1,
  backgroundColor: semantic.surface.crest,
  border: `1px solid ${semantic.border.raised}`,
  paddingLeft: s(spacing.sm),
  paddingRight: s(spacing.sm),
  paddingTop: vs(spacing.xxs),
  paddingBottom: vs(spacing.xxs),
  borderRadius: ms(borderRadius.sm),
  opacity: $visible ? 1 : 0,
}));

const NetworkLabelText = styled(Typography)({
  fontSize: ms(fontSize.xs),
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: semantic.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.wide,
});

const BalanceRow = styled(Box)({
  position: 'relative' as const,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: s(spacing.md),
});

const BalanceDollars = styled(Typography)({
  ...tabularNums.css,
  fontSize: ms(fontSize.balance),
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.balance,
  letterSpacing: letterSpacing.balance,
  lineHeight: 1,
});

const BalanceDecimals = styled(Typography)({
  ...tabularNums.css,
  fontSize: ms(fontSize.balance),
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  letterSpacing: letterSpacing.balance,
  opacity: opacity.faint,
  lineHeight: 1,
});

const EyeButton = styled('button')({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: s(spacing.xs),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  lineHeight: lineHeight.none,
  color: colors.text.muted,
  '&::-moz-focus-inner': {
    border: 0,
    padding: 0,
  },
  '&:hover': {
    opacity: opacity.medium,
  },
});

const ChangeRow = styled(Box)({
  position: 'relative' as const,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
});

const ChangeText = styled(Typography)<{ $color?: string }>(({ $color }) => ({
  ...tabularNums.css,
  fontSize: ms(fontSize.sm),
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: $color || colors.text.muted,
  letterSpacing: letterSpacing.change,
}));

const TrendingIconWrapper = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginLeft: s(spacing.xxs),
  marginRight: s(spacing.xxs),
});

const Pagination = styled(Box)({
  position: 'relative' as const,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: vs(spacing.sm),
});

const PaginationDot = styled(Box)<{ $active?: boolean }>(({ $active }) => ({
  width: s(spacing.xs),
  height: s(spacing.xs),
  borderRadius: s(spacing.xxs),
  // Which chain you are looking at is a selected state, so the active dot is
  // salmon ink (6.07:1) against inactive neutral — a 4px mark, not a fill.
  backgroundColor: $active ? semantic.accent.ink : colors.step.inactive,
  margin: `0 ${s(spacing.xxs + 1)}px`,
}));

const shimmer = keyframes`
  0% { background-position: -${componentSizes.shimmerOffset}px 0; }
  100% { background-position: ${componentSizes.shimmerOffset}px 0; }
`;

const SkeletonRect = styled(Box)({
  borderRadius: ms(borderRadius.sm),
  background: `linear-gradient(90deg, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 75%)`,
  backgroundSize: `${componentSizes.shimmerWidth}px 100%`,
  animation: `${shimmer} ${durationMs.shimmer}ms ${easing.easeInOut} infinite`,
  // The calm form: the gradient stays as the resting placeholder, the sweep
  // does not run — the same per-component guard PendingValue and the
  // LoadingScreen crests carry.
  [`@media ${reducedMotion.query}`]: {
    animation: 'none',
  },
});

/**
 * Everything on the card that belongs to one chain. Switching chains replaces
 * this whole payload at once; a balance refresh on the *same* chain replaces it
 * in place, with no fade — a number landing is not a state change.
 */
interface ChainContent {
  blockchain: BlockchainId;
  usdTotal: number | undefined;
  changePercent: number;
  changeAmount: number;
  loading: boolean;
}

/**
 * Crossfade the card's *contents* when the chain changes, leaving the card
 * itself where it is.
 *
 * Switching chains with the carousel arrows is a state change in place, so it
 * gets `swell` (180ms) — spent as `flick` out and `flick` in, with the swap at
 * the midpoint where nothing is visible. The card container, its background and
 * its pagination dots never take part: the plane stays, only what is printed on
 * it changes.
 *
 * Under reduce-motion the swap timer collapses with the CSS transition (the
 * global `prefers-reduced-motion` block already flattens that), so the content
 * steps to its new value instead of leaving a 90ms gap of nothing.
 */
function useChainCrossfade(next: ChainContent): { shown: ChainContent; visible: boolean } {
  const isReduceMotionEnabled = useReducedMotion();
  const [shown, setShown] = useState<ChainContent>(next);
  const [visible, setVisible] = useState(true);
  const { blockchain, usdTotal, changePercent, changeAmount, loading } = next;

  useEffect(() => {
    if (shown.blockchain === blockchain) {
      if (
        shown.usdTotal !== usdTotal ||
        shown.changePercent !== changePercent ||
        shown.changeAmount !== changeAmount ||
        shown.loading !== loading
      ) {
        setShown({ blockchain, usdTotal, changePercent, changeAmount, loading });
      }
      return;
    }

    setVisible(false);
    const swapAt = setTimeout(
      () => {
        setShown({ blockchain, usdTotal, changePercent, changeAmount, loading });
        setVisible(true);
      },
      resolveMotionMs(motionMs.flick, isReduceMotionEnabled)
    );
    return () => clearTimeout(swapAt);
  }, [shown, blockchain, usdTotal, changePercent, changeAmount, loading, isReduceMotionEnabled]);

  return { shown, visible };
}

export function BalanceCard({
  network: _network,
  blockchain = 'solana',
  usdTotal: nextUsdTotal,
  changePercent: nextChangePercent = 0,
  changeAmount: nextChangeAmount = 0,
  hiddenBalance = false,
  onToggleVisibility,
  currentIndex = 0,
  totalCount = 1,
  loading: nextLoading = false,
  showNetworkLabel = false,
  style,
  className,
}: BalanceCardProps) {
  const { t } = useTranslation();
  const [, { formatValue, formatChange }] = useCurrencyContext();

  const { shown, visible } = useChainCrossfade({
    blockchain,
    usdTotal: nextUsdTotal,
    changePercent: nextChangePercent,
    changeAmount: nextChangeAmount,
    loading: nextLoading,
  });
  const { blockchain: shownBlockchain, usdTotal, changePercent, changeAmount, loading } = shown;

  const handleToggleVisibility = useCallback(() => {
    onToggleVisibility?.();
  }, [onToggleVisibility]);

  const labelType = getLabelValue(changePercent);
  const changeColor = colors.change[labelType];
  const isPositive = changePercent >= 0;

  const displayPercentage = formatPercentage(changePercent);
  const displayAbsChange = formatChange(changeAmount);

  const gradientCSS = getGradientCSSForBlockchain(shownBlockchain);
  // In developer mode, always show network label (including "Mainnet")
  const networkLabel = showNetworkLabel
    ? (getNetworkLabel(shownBlockchain) ?? t('general.network_mainnet', 'Mainnet'))
    : null;

  const renderBalance = () => {
    if (hiddenBalance) {
      return (
        <BalanceRow>
          <BalanceDollars>{hiddenValue}</BalanceDollars>
          <EyeButton
            onClick={handleToggleVisibility}
            aria-label={t('accessibility.show_balance', 'Show balance')}
            data-testid="balance-eye-toggle"
          >
            <EyeOffIcon size={ms(componentSizes.eyeIcon)} />
          </EyeButton>
        </BalanceRow>
      );
    }

    const formatted = formatValue(usdTotal);
    const parts = formatted.split('.');

    return (
      <BalanceRow>
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <BalanceDollars>{parts[0]}</BalanceDollars>
          {parts[1] && <BalanceDecimals>.{parts[1]}</BalanceDecimals>}
        </Box>
        <EyeButton
          onClick={handleToggleVisibility}
          aria-label={t('accessibility.hide_balance', 'Hide balance')}
          data-testid="balance-eye-toggle"
        >
          <EyeIcon size={ms(componentSizes.eyeIcon)} />
        </EyeButton>
      </BalanceRow>
    );
  };

  const renderChange = () => {
    if (hiddenBalance) {
      return (
        <ChangeRow>
          <ChangeText>{hiddenValue}</ChangeText>
        </ChangeRow>
      );
    }

    return (
      <ChangeRow>
        <ChangeText $color={changeColor}>{displayPercentage}</ChangeText>
        <TrendingIconWrapper>
          <Icon
            name={isPositive ? 'chevron-up' : 'chevron-down'}
            size={ms(componentSizes.changeArrowIcon)}
            color={changeColor}
          />
        </TrendingIconWrapper>
        {displayAbsChange && <ChangeText $color={changeColor}>({displayAbsChange})</ChangeText>}
      </ChangeRow>
    );
  };

  return (
    <Container style={{ ...style, background: gradientCSS }} className={className}>
      {/* Group 1: Logo + Network tag — where chain identity lives. No motif
          here: the motif belongs to the water, and this card is content. It
          carries the 60px total, and the hardest rule the scales have is that
          they never sit behind a numeric value. Scoping the field to the band
          above the figure was a way of surviving that rule; now that the
          column runs the full height of the ground behind this card, a second
          field inside the card is the wallpaper use DESIGN.md refuses. The
          card is a lit opaque plane over the water, and that is its job. */}
      <ChainFace $visible={visible} data-testid="balance-card-chain-face">
        <LogoGroup>
          <LogoContainer>{renderBlockchainLogo(shownBlockchain)}</LogoContainer>
          <NetworkLabel $visible={!!networkLabel}>
            <NetworkLabelText>{networkLabel ?? '\u00A0'}</NetworkLabelText>
          </NetworkLabel>
        </LogoGroup>

        {/* Group 2: Balance + Change */}
        <ContentGroup>
          {loading ? (
            <BalanceRow>
              <SkeletonRect
                sx={{
                  width: ms(componentSizes.buttonMinWidthLg),
                  height: ms(fontSize.balance),
                  borderRadius: `${ms(borderRadius.sm)}px`,
                }}
              />
            </BalanceRow>
          ) : (
            renderBalance()
          )}
          {loading ? (
            <ChangeRow>
              <SkeletonRect
                sx={{
                  width: ms(componentSizes.buttonMinWidth),
                  height: ms(fontSize.sm * 1.3),
                  borderRadius: `${ms(borderRadius.sm)}px`,
                }}
              />
            </ChangeRow>
          ) : (
            renderChange()
          )}
        </ContentGroup>
      </ChainFace>

      {/* Group 3: Pagination dots — outside the face on purpose. Which chain
          you are on is selection feedback, and feedback is preserved: the dot
          moves the instant the arrow is pressed, before the face has faded. */}
      {totalCount > 1 && (
        <Pagination>
          {Array.from({ length: totalCount }).map((_, index) => (
            <PaginationDot key={index} $active={index === currentIndex} />
          ))}
        </Pagination>
      )}
    </Container>
  );
}

export default BalanceCard;
