/**
 * DerivedAccountCard - Selectable account card for derived account discovery
 *
 * Web version using MUI and @emotion/styled for browser extension.
 */
import React from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CheckIcon, iconSize } from '../../icons';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  componentSizes,
  fontFamily,
  fontWeight,
  fontSize,
  duration,
  easing,
  tabularNums,
} from '@salmon/shared';
import { SolanaSvgIcon, BitcoinSvgIcon, EthereumSvgIcon } from '../Icon';
import type { DerivedAccountCardProps } from './types';

const ICON_SIZE = componentSizes.iconSizeXs;

const BlockchainIcon: React.FC<{ blockchain?: string }> = ({ blockchain }) => {
  const iconStyle = {
    fontSize: ICON_SIZE,
    width: ICON_SIZE,
    height: ICON_SIZE,
    color: colors.text.tertiary,
  };
  switch (blockchain) {
    case 'solana':
      return <SolanaSvgIcon style={iconStyle} />;
    case 'bitcoin':
      return <BitcoinSvgIcon style={iconStyle} />;
    case 'ethereum':
      return <EthereumSvgIcon style={iconStyle} />;
    default:
      return null;
  }
};

const Card = styled(Box)<{ $selected: boolean }>(({ $selected }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.card.background,
  borderRadius: borderRadius.xl,
  border: `${borderWidth.thin}px solid ${$selected ? colors.card.borderActive : colors.card.border}`,
  padding: spacing.lg,
  marginBottom: spacing.md,
  cursor: 'pointer',
  transition: `border-color ${duration.normal} ${easing.ease}`,
  '&:hover': {
    borderColor: $selected ? colors.card.borderActive : colors.accent.primary,
  },
}));

const Checkbox = styled(Box)<{ $selected: boolean }>(({ $selected }) => ({
  width: componentSizes.checkboxSize,
  height: componentSizes.checkboxSize,
  borderRadius: borderRadius.sm,
  backgroundColor: $selected ? colors.accent.primary : colors.interactive.highlight,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: spacing.lg,
  flexShrink: 0,
}));

const Info = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const Address = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.bodyLg,
});

const NetworkRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  marginTop: spacing.xxs,
});

const PathText = styled(Typography)({
  ...tabularNums.css,
  color: colors.text.tertiary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  fontSize: fontSize.sm,
});

const BalanceContainer = styled(Box)({
  display: 'flex',
  alignItems: 'flex-end',
  flexShrink: 0,
});

const Balance = styled(Typography)<{ $dimmed: boolean }>(({ $dimmed }) => ({
  ...tabularNums.css,
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.base,
  opacity: $dimmed ? 0.4 : 1,
}));

const DerivedAccountCardComponent: React.FC<DerivedAccountCardProps> = ({
  address,
  networkName,
  path,
  balanceFormatted,
  selected,
  dimmed,
  onToggle,
  blockchain,
  style,
  className,
  testID,
}) => {
  return (
    <Card
      $selected={selected}
      onClick={onToggle}
      style={style}
      className={className}
      data-testid={testID}
    >
      <Checkbox $selected={selected}>
        {selected && <CheckIcon size={iconSize.sm} color={colors.text.primary} />}
      </Checkbox>

      <Info>
        <Address>{address}</Address>
        <NetworkRow>
          <BlockchainIcon blockchain={blockchain} />
          <PathText>
            {networkName} &middot; {path}
          </PathText>
        </NetworkRow>
      </Info>

      <BalanceContainer>
        <Balance $dimmed={dimmed}>{balanceFormatted}</Balance>
      </BalanceContainer>
    </Card>
  );
};

export const DerivedAccountCard = React.memo(DerivedAccountCardComponent);
