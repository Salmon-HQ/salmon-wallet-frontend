import { CheckIcon, iconSize } from '../../icons';
import {
  borderRadius,
  borderWidth,
  colors,
  componentSizes,
  spacing,
  fontSize,
  fontFamilyNative,
  opacity,
  semantic,
} from '@salmon/shared';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SolanaSvgIcon, BitcoinSvgIcon, EthereumSvgIcon } from '../Icon/SvgIcons';
import type { DerivedAccountCardProps } from './types';

const ICON_SIZE = 16;

const BlockchainIcon: React.FC<{ blockchain?: string }> = ({ blockchain }) => {
  switch (blockchain) {
    case 'solana':
      return <SolanaSvgIcon size={ICON_SIZE} color={colors.text.tertiary} />;
    case 'bitcoin':
      return <BitcoinSvgIcon size={ICON_SIZE} color={colors.text.tertiary} />;
    case 'ethereum':
      return <EthereumSvgIcon size={ICON_SIZE} color={colors.text.tertiary} />;
    default:
      return null;
  }
};

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
  testID,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected, style]}
      onPress={onToggle}
      activeOpacity={0.7}
      testID={testID}
    >
      {/* Checkbox */}
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <CheckIcon size={iconSize.sm} color={semantic.accent.onFill} />}
      </View>

      {/* Account Info */}
      <View style={styles.info}>
        <Text style={styles.address}>{address}</Text>
        <View style={styles.networkRow}>
          <BlockchainIcon blockchain={blockchain} />
          <Text style={styles.path}>
            {networkName} · {path}
          </Text>
        </View>
      </View>

      {/* Balance */}
      <View style={styles.balanceContainer}>
        <Text style={[styles.balance, dimmed && styles.dimmed]}>{balanceFormatted}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const DerivedAccountCard = React.memo(DerivedAccountCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.xl,
    borderWidth: borderWidth.thin,
    borderColor: colors.card.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardSelected: {
    borderColor: semantic.state.selectedEdge,
  },
  checkbox: {
    width: componentSizes.checkboxSize,
    height: componentSizes.checkboxSize,
    borderRadius: 6,
    backgroundColor: colors.interactive.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  checkboxSelected: {
    backgroundColor: colors.accent.primary,
  },
  info: {
    flex: 1,
  },
  address: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  path: {
    color: colors.text.tertiary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.sm,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balance: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.base,
  },
  dimmed: {
    opacity: opacity.faint,
  },
});
