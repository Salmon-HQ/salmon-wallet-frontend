/**
 * TokenListItem - Individual token row component
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Uses responsive scaling (s, vs, ms) from shared to match mobile proportions.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  fontSize,
  fontFamily,
  fontWeight,
  componentSizes,
  s,
  vs,
  ms,
  showPercentage,
  getLabelValue,
  hiddenValue,
  useCurrencyContext,
  opacity,
  duration,
  easing,
  tabularNums,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import { TokenBadges } from './TokenBadges';
import type { TokenListItemProps } from './types';

/**
 * Default placeholder image for tokens without a logo
 */
const DEFAULT_TOKEN_LOGO =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

// --- Bitcoin layout styled components ---

const BitcoinContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: `${vs(spacing.md)}px ${s(spacing.lg)}px`,
  cursor: 'pointer',
  gap: s(spacing.md),
  transition: `opacity ${duration.normal} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.high,
  },
});

const BitcoinLogo = styled('img')({
  width: s(componentSizes.tokenIconSm),
  height: s(componentSizes.tokenIconSm),
  borderRadius: '50%',
  backgroundColor: colors.background.tertiary,
  objectFit: 'cover',
  flexShrink: 0,
});

const BitcoinInfoContainer = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const BitcoinPrice = styled(Typography)({
  ...tabularNums.css,
  fontSize: ms(fontSize.tokenNamePrice),
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  marginBottom: vs(spacing.xxs),
});

const BitcoinChangeRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: s(spacing.xxs),
});

const BitcoinChangeText = styled(Typography)<{ $changeColor?: string }>(({ $changeColor }) => ({
  ...tabularNums.css,
  fontSize: ms(fontSize.tokenChange),
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: $changeColor || colors.text.muted,
}));

const BitcoinAmountContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  textAlign: 'right',
});

const BitcoinAmount = styled(Typography)({
  ...tabularNums.css,
  fontSize: ms(fontSize.lg),
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  // Neutral for the same reason as `TokenAmount` above.
  color: colors.text.primary,
});

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: `${vs(spacing.md)}px ${s(spacing.lg)}px`,
  cursor: 'pointer',
  gap: s(spacing.md),
  transition: `opacity ${duration.normal} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.high,
  },
});

const TokenLogo = styled('img')({
  width: s(componentSizes.tokenIcon),
  height: s(componentSizes.tokenIcon),
  borderRadius: ms(borderRadius.tokenIcon),
  backgroundColor: colors.background.tertiary,
  objectFit: 'cover',
  flexShrink: 0,
});

const TokenLogoPlaceholder = styled(Box)({
  width: s(componentSizes.tokenIcon),
  height: s(componentSizes.tokenIcon),
  borderRadius: ms(borderRadius.tokenIcon),
  backgroundColor: colors.background.tertiary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: ms(fontSize.base),
  color: colors.text.secondary,
  flexShrink: 0,
});

const InfoContainer = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const NameRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: vs(spacing.xxs),
  minWidth: 0,
});

const TokenName = styled(Typography)({
  fontSize: ms(fontSize.tokenNamePrice),
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flexShrink: 1,
  minWidth: 0,
});

const PriceRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: s(spacing.xxs),
});

const Price = styled(Typography)({
  ...tabularNums.css,
  fontSize: ms(fontSize.tokenNamePrice),
  fontFamily: fontFamily.sans,
  color: colors.text.muted,
});

const BulletSeparator = styled(Typography)({
  fontSize: ms(fontSize.tokenNamePrice),
  color: 'rgba(255, 255, 255, 0.5)',
});

const ChangeText = styled(Typography)<{ $changeColor?: string }>(({ $changeColor }) => ({
  ...tabularNums.css,
  fontSize: ms(fontSize.tokenChange),
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: $changeColor || colors.text.muted,
}));

const ValueContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  textAlign: 'right',
  gap: vs(spacing.xs),
});

const UsdValue = styled(Typography)({
  ...tabularNums.css,
  fontSize: ms(fontSize.lg),
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  marginBottom: vs(spacing.xxs),
});

/**
 * Deliberately neutral. This was tried in salmon ink — it is the quantity you
 * actually hold, so it looked like the row's subject — and it failed on screen:
 * it lands one column away from the 24h change, which is `danger-500` rose
 * whenever the token is down, and two warm reds on one 44px row is exactly the
 * collision the ramps were hue-separated to avoid. The row already carries
 * colour, and it belongs to price movement.
 */
const TokenAmount = styled(Typography)({
  ...tabularNums.css,
  fontSize: ms(fontSize.sm),
  fontFamily: fontFamily.sans,
  color: colors.text.muted,
});

export function TokenListItem({
  token,
  onPress,
  hiddenBalance = false,
  blockchain = 'solana',
  style,
  className,
}: TokenListItemProps) {
  const { t } = useTranslation();
  const [, { formatValue, formatChange }] = useCurrencyContext();
  const { name, symbol, logo, price, uiAmount, usdBalance, last24HoursChange, tags } = token;

  const handlePress = useCallback(() => {
    onPress?.(token);
  }, [onPress, token]);

  const percentageChange = last24HoursChange?.perc ?? 0;
  const absoluteChange = last24HoursChange?.abs;
  const labelType = getLabelValue(percentageChange);
  const changeColor = colors.change[labelType];

  const displayPrice = hiddenBalance ? hiddenValue : price != null ? formatValue(price) : null;

  const displayPercentage = last24HoursChange ? showPercentage(percentageChange) : null;
  const displayAbsChange = absoluteChange != null ? formatChange(absoluteChange) : null;

  const displayUsdValue = hiddenBalance
    ? hiddenValue
    : usdBalance != null
      ? formatValue(usdBalance)
      : null;

  const displayTokenAmount = hiddenBalance ? hiddenValue : `${uiAmount} ${symbol || ''}`;

  const blurContainerStyle = {
    borderRadius: ms(borderRadius.lg),
    marginBottom: vs(spacing.sm),
    overflow: 'hidden' as const,
  };

  // Bitcoin layout: price on left, amount on right, no chevron
  if (blockchain === 'bitcoin') {
    return (
      <BlurContainer borderWidth={borderWidth.tokenListItem} style={blurContainerStyle}>
        <BitcoinContainer
          style={style}
          className={className}
          aria-label={t(
            'accessibility.token_balance',
            '{{name}} token, balance {{amount}} {{symbol}}',
            { name, amount: uiAmount, symbol }
          )}
          data-testid={`token-row-${symbol}`}
        >
          {logo ? (
            <BitcoinLogo
              src={logo}
              alt={name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_TOKEN_LOGO;
              }}
            />
          ) : (
            <TokenLogoPlaceholder>{symbol?.[0] || '?'}</TokenLogoPlaceholder>
          )}

          <BitcoinInfoContainer>
            {displayPrice && <BitcoinPrice>{displayPrice}</BitcoinPrice>}
            <BitcoinChangeRow>
              {displayPercentage && (
                <BitcoinChangeText $changeColor={changeColor}>
                  {displayPercentage}
                </BitcoinChangeText>
              )}
              {displayAbsChange && (
                <BitcoinChangeText $changeColor={changeColor}>{displayAbsChange}</BitcoinChangeText>
              )}
            </BitcoinChangeRow>
          </BitcoinInfoContainer>

          <BitcoinAmountContainer>
            <BitcoinAmount>{displayTokenAmount}</BitcoinAmount>
          </BitcoinAmountContainer>
        </BitcoinContainer>
      </BlurContainer>
    );
  }

  // Default Solana/Ethereum layout
  return (
    <BlurContainer borderWidth={borderWidth.tokenListItem} style={blurContainerStyle}>
      <Container
        onClick={handlePress}
        style={style}
        className={className}
        role="button"
        aria-label={t(
          'accessibility.token_balance',
          '{{name}} token, balance {{amount}} {{symbol}}',
          { name, amount: uiAmount, symbol }
        )}
        data-testid={`token-row-${symbol}`}
      >
        {logo ? (
          <TokenLogo
            src={logo}
            alt={name}
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_TOKEN_LOGO;
            }}
          />
        ) : (
          <TokenLogoPlaceholder>{symbol?.[0] || '?'}</TokenLogoPlaceholder>
        )}

        <InfoContainer>
          <NameRow>
            <TokenName>{name}</TokenName>
            <TokenBadges tags={tags} />
          </NameRow>
          <PriceRow>
            {displayPrice && <Price>{displayPrice}</Price>}
            {displayPercentage && (
              <>
                <BulletSeparator>{'\u2022'}</BulletSeparator>
                <ChangeText $changeColor={changeColor}>
                  {displayPercentage}
                  {displayAbsChange && ` (${displayAbsChange})`}
                </ChangeText>
              </>
            )}
          </PriceRow>
        </InfoContainer>

        <ValueContainer>
          {displayUsdValue && <UsdValue>{displayUsdValue}</UsdValue>}
          <TokenAmount>{displayTokenAmount}</TokenAmount>
        </ValueContainer>
      </Container>
    </BlurContainer>
  );
}
