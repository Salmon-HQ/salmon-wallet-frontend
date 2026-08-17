/**
 * TransactionItem - Individual transaction row for the transaction list
 *
 * Migrated from packages/ui (React Native) to MUI styled components.
 *
 * Features:
 * - Transaction type icon with token logos
 * - Collapses multiple amounts with expandable route visualization
 * - Badge showing source protocol (Jupiter, etc.)
 * - Click to expand swap routes, right-click or double-click for detail view
 */

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsLeftRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  ClockIcon,
  FireIcon,
  LockIcon,
  PlusCircleIcon,
  QuestionIcon,
  SquaresFourIcon,
  WalletIcon,
  XCircleIcon,
  iconSize,
} from '../../icons';
import type { IconComponent } from '../../icons';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import {
  borderRadius,
  borderWidth,
  colors,
  componentSizes,
  fontWeight,
  formatRawAmount,
  formatRelativeTimeCompact,
  getTransactionDescription,
  fontSize,
  letterSpacing,
  opacity,
  spacing,
  duration,
  easing,
  tabularNums,
} from '@salmon/shared';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import { BlurContainer } from '../BlurContainer';
import { SwapRouteVisualization } from './SwapRouteVisualization';
import type { TransactionItemProps, TransactionTokenAmount, TransactionType } from './types';

// ============================================================================
// Constants
// ============================================================================

const HIDDEN_VALUE = '****';
const MAX_VISIBLE_AMOUNTS = 2;

// ============================================================================
// Transaction Type Config
// ============================================================================

interface TypeConfig {
  label: string;
  IconComponent: IconComponent;
  color: string;
}

const TYPE_CONFIGS: Record<TransactionType, TypeConfig> = {
  send: {
    label: 'Sent',
    IconComponent: ArrowUpIcon,
    color: colors.change.negative,
  },
  receive: {
    label: 'Received',
    IconComponent: ArrowDownIcon,
    color: colors.change.positive,
  },
  swap: {
    label: 'Swapped',
    IconComponent: ArrowsLeftRightIcon,
    color: colors.palette.purple,
  },
  mint: {
    label: 'Minted',
    IconComponent: PlusCircleIcon,
    color: colors.palette.cyan,
  },
  burn: {
    label: 'Burned',
    IconComponent: FireIcon,
    color: colors.palette.orange,
  },
  stake: {
    label: 'Staked',
    IconComponent: LockIcon,
    color: colors.palette.green,
  },
  loan: {
    label: 'Loan',
    IconComponent: WalletIcon,
    color: colors.palette.amber,
  },
  interaction: {
    label: 'Interaction',
    IconComponent: SquaresFourIcon,
    color: colors.palette.blue,
  },
  unknown: {
    label: 'Unknown',
    IconComponent: QuestionIcon,
    color: colors.text.secondary,
  },
};

const TYPE_LABEL_KEYS: Record<TransactionType, string> = {
  send: 'transactions.detail.sent',
  receive: 'transactions.detail.received',
  swap: 'transactions.detail.swapped',
  mint: 'transactions.detail.minted',
  burn: 'transactions.detail.burned',
  stake: 'transactions.detail.staked',
  loan: 'transactions.detail.loan',
  interaction: 'transactions.detail.interaction',
  unknown: 'transactions.detail.unknown',
};

function getTypeConfig(
  type: TransactionType
): TypeConfig & { icon: React.ReactNode; badgeIcon: React.ReactNode } {
  const config = TYPE_CONFIGS[type] || TYPE_CONFIGS.unknown;
  const { IconComponent } = config;

  return {
    ...config,
    icon: <IconComponent size={iconSize.md} />,
    badgeIcon: <IconComponent size={iconSize.sm} color={colors.text.primary} />,
  };
}

// ============================================================================
// Styled Components
// ============================================================================

const ItemWrapper = styled(Box)({
  marginBottom: spacing.md,
  transition: `opacity ${duration.normal} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.high,
  },
});

const ItemButton = styled(ButtonBase)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  width: '100%',
  padding: `${spacing.lg}px ${spacing.lg}px`,
  textAlign: 'left',
  justifyContent: 'flex-start',
});

const LogoSection = styled(Box)({
  marginRight: spacing.md,
  flexShrink: 0,
});

const TokenLogoImg = styled('img')({
  borderRadius: '50%',
  backgroundColor: colors.background.card,
  objectFit: 'cover',
});

const TokenLogoPlaceholder = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  backgroundColor: colors.background.card,
});

const SwapLogosContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  width: componentSizes.iconSize5XL,
  position: 'relative',
});

const SwapLogoOverlap = styled(Box)({
  marginLeft: -spacing.lg,
  border: `${borderWidth.medium}px solid ${colors.background.secondary}`,
  borderRadius: borderRadius.iconContainer,
  display: 'flex',
});

const LogoWithBadgeContainer = styled(Box)({
  position: 'relative',
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
});

const TypeBadge = styled(Box)({
  position: 'absolute',
  top: -spacing.xs,
  right: -spacing.xs,
  width: componentSizes.iconSizeXSmall,
  height: componentSizes.iconSizeXSmall,
  borderRadius: borderRadius.md,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `${borderWidth.medium}px solid ${colors.background.secondary}`,
});

const TypeBadgeSingle = styled(TypeBadge)({
  top: -spacing.xxs,
  right: -spacing.xxs,
});

const IconContainer = styled(Box)({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: borderRadius.iconLg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const InfoSection = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minWidth: 0,
});

const TypeRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
  marginBottom: spacing.xs,
});

const TypeText = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const SourceBadge = styled(Chip)({
  height: componentSizes.iconSizeXSmall,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: colors.text.tertiary,
  backgroundColor: colors.background.card,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.semiWide,
  '& .MuiChip-label': {
    padding: `0 ${spacing.sm}px`,
  },
});

const DescriptionText = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.secondary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const RightSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  marginLeft: spacing.sm,
  flexShrink: 0,
});

const AmountsContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
});

const AmountText = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  marginBottom: spacing.xxs,
  whiteSpace: 'nowrap',
});

const TimeRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: spacing.xs,
});

const TimeText = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.xs,
  color: colors.text.tertiary,
});

const FailedBadge = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
});

const FailedText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.status.error,
});

const PendingBadge = styled(Box)({
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  padding: `${spacing.xs}px ${spacing.sm}px`,
  backgroundColor: `${colors.status.warning}15`,
  borderRadius: borderRadius.sm,
});

const PendingText = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: colors.status.warning,
});

const ExpandBadge = styled(Box)({
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xxs,
  marginTop: spacing.xs,
  padding: `${spacing.xxs}px ${spacing.xs}px`,
  borderRadius: borderRadius.sm,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

const ExpandText = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: colors.palette.amber,
});

// ============================================================================
// Sub-components
// ============================================================================

const TokenLogo: React.FC<{ uri?: string | null; size?: number }> = ({
  uri,
  size = componentSizes.iconSize2XL,
}) => {
  const [failed, setFailed] = useState(false);

  if (uri && !failed) {
    return (
      <TokenLogoImg
        src={uri}
        alt=""
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <TokenLogoPlaceholder style={{ width: size, height: size }}>
      <QuestionIcon size={size * 0.6} color={colors.text.secondary} />
    </TokenLogoPlaceholder>
  );
};

const AmountDisplay: React.FC<{
  token: TransactionTokenAmount;
  sign: '+' | '-';
  hidden: boolean;
}> = ({ token, sign, hidden }) => {
  const displayAmount = hidden
    ? `${sign} ${HIDDEN_VALUE} ${token.symbol}`
    : `${sign} ${formatRawAmount(token.amount, token.decimals)} ${token.symbol}`;

  const color = sign === '+' ? colors.change.positive : colors.change.negative;

  return (
    <AmountText sx={{ color }} noWrap>
      {displayAmount}
    </AmountText>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function TransactionItem({
  transaction,
  onPress,
  onDetailClick,
  hiddenBalance = false,
  className,
  style,
}: TransactionItemProps) {
  const { t } = useTranslation();
  const { type, timestamp, status, inputs, outputs, description, source } = transaction;
  const config = getTypeConfig(type);

  const [expanded, setExpanded] = useState(false);

  const totalAmounts = inputs.length + outputs.length;
  const isComplex = type === 'swap' && totalAmounts > MAX_VISIBLE_AMOUNTS;
  const isSwap = type === 'swap';

  const handleClick = useCallback(() => {
    if (isSwap) {
      setExpanded((prev) => !prev);
    } else {
      onPress?.(transaction);
    }
  }, [isSwap, onPress, setExpanded, transaction]);

  const handleDoubleClick = useCallback(() => {
    onDetailClick?.(transaction);
  }, [onDetailClick, transaction]);

  const descriptionText = useMemo(
    () => getTransactionDescription(type, inputs, outputs, source, description),
    [type, inputs, outputs, source, description]
  );

  // Render logo
  const renderLogo = () => {
    if (type === 'swap' && inputs[0]?.logo && outputs[0]?.logo) {
      return (
        <SwapLogosContainer>
          <TokenLogo uri={outputs[0].logo} size={34} />
          <SwapLogoOverlap>
            <TokenLogo uri={inputs[0].logo} size={34} />
          </SwapLogoOverlap>
          <TypeBadge sx={{ backgroundColor: config.color }}>{config.badgeIcon}</TypeBadge>
        </SwapLogosContainer>
      );
    }

    const primaryToken = type === 'receive' ? inputs[0] : outputs[0] || inputs[0];
    if (primaryToken?.logo) {
      return (
        <LogoWithBadgeContainer>
          <TokenLogo uri={primaryToken.logo} size={40} />
          <TypeBadgeSingle sx={{ backgroundColor: config.color }}>
            {config.badgeIcon}
          </TypeBadgeSingle>
        </LogoWithBadgeContainer>
      );
    }

    return (
      <IconContainer sx={{ backgroundColor: `${config.color}20`, color: config.color }}>
        {config.icon}
      </IconContainer>
    );
  };

  // Helper to render token amounts
  const renderTokenAmounts = (tokens: TransactionTokenAmount[], sign: '+' | '-') => {
    return tokens.map((token, i) => (
      <AmountDisplay key={`${sign}-${i}`} token={token} sign={sign} hidden={hiddenBalance} />
    ));
  };

  // Render amounts
  const renderAmounts = () => {
    // Status badges
    if (status === 'failed') {
      return (
        <FailedBadge>
          <XCircleIcon size={iconSize.sm} color={colors.status.error} />
          <FailedText>{t('transactions.detail.failed', 'Failed')}</FailedText>
        </FailedBadge>
      );
    }

    if (status === 'pending') {
      return (
        <PendingBadge>
          <ClockIcon size={iconSize.sm} color={colors.status.warning} />
          <PendingText>{t('transactions.detail.pending', 'Pending')}</PendingText>
        </PendingBadge>
      );
    }

    // Complex swap — show first two amounts only
    if (isComplex) {
      const firstOutput = outputs[0];
      const firstInput = inputs[0];

      return (
        <AmountsContainer>
          {firstOutput && <AmountDisplay token={firstOutput} sign="-" hidden={hiddenBalance} />}
          {firstInput && <AmountDisplay token={firstInput} sign="+" hidden={hiddenBalance} />}
        </AmountsContainer>
      );
    }

    // Type-specific amount rendering
    const showOutputs = type !== 'receive';
    const showInputs = type !== 'send';

    return (
      <AmountsContainer>
        {showOutputs && renderTokenAmounts(outputs, '-')}
        {showInputs && renderTokenAmounts(inputs, '+')}
      </AmountsContainer>
    );
  };

  return (
    <ItemWrapper className={className} style={style}>
      <BlurContainer
        borderColor={colors.border.subtle}
        style={{ borderRadius: borderRadius.lg, overflow: 'hidden' }}
      >
        <ItemButton
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          aria-label={t('accessibility.transaction_row', '{{type}} transaction, {{description}}', {
            type: t(TYPE_LABEL_KEYS[type] ?? TYPE_LABEL_KEYS.unknown, config.label),
            description: descriptionText,
          })}
          data-testid="activity-tx-row"
        >
          {/* Left: Logo/Icon */}
          <LogoSection>{renderLogo()}</LogoSection>

          {/* Center: Type and description */}
          <InfoSection>
            <TypeRow>
              <TypeText>
                {t(TYPE_LABEL_KEYS[type] ?? TYPE_LABEL_KEYS.unknown, config.label)}
              </TypeText>
              {source && <SourceBadge label={source} size="small" />}
            </TypeRow>
            <DescriptionText>{descriptionText}</DescriptionText>
          </InfoSection>

          {/* Right: Amounts and time */}
          <RightSection>
            {renderAmounts()}
            <TimeRow>
              <TimeText>{formatRelativeTimeCompact(timestamp, t)}</TimeText>
            </TimeRow>
            {isComplex && (
              <ExpandBadge
                role="button"
                tabIndex={0}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setExpanded((prev) => !prev);
                }}
              >
                <ExpandText>
                  {expanded
                    ? t('transactions.showLess', 'show less')
                    : t('transactions.showMore', 'show more')}
                </ExpandText>
                {expanded ? (
                  <CaretUpIcon size={iconSize.sm} color={colors.palette.amber} />
                ) : (
                  <CaretDownIcon size={iconSize.sm} color={colors.palette.amber} />
                )}
              </ExpandBadge>
            )}
          </RightSection>
        </ItemButton>

        {/* Expandable route visualization for swaps */}
        {type === 'swap' && (
          <SwapRouteVisualization transaction={transaction} expanded={expanded} />
        )}
      </BlurContainer>
    </ItemWrapper>
  );
}
