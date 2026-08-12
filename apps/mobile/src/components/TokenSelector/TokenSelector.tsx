import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  borderWidth,
  colors,
  getShortAddress,
  borderRadius,
  spacing,
  fontFamilyNative,
  fontSize,
  fontWeight,
  opacity,
} from '@salmon/shared';
import { TokenSelectorModal } from './TokenSelectorModal';
import type { TokenSelectorToken, TokenSelectorProps } from './types';

/**
 * TokenSelector component for selecting tokens and entering amounts
 *
 * Combines an input field for amount entry with a token selector button.
 * Opens a modal with search and pagination for token selection.
 *
 * @example
 * ```tsx
 * <TokenSelector
 *   value={amount}
 *   onChangeValue={setAmount}
 *   tokens={userTokens}
 *   featuredTokens={[solToken, usdcToken]}
 *   selectedToken={selectedToken}
 *   onTokenSelect={handleTokenSelect}
 *   onSearch={searchTokens}
 *   placeholder="0.00"
 * />
 * ```
 */
export function TokenSelector({
  value,
  onChangeValue,
  tokens,
  featuredTokens,
  onTokenSelect,
  selectedToken,
  onSearch,
  placeholder = '0.00',
  hiddenBalance = false,
  showNetworkChip = false,
  showVerifiedDisclaimer = false,
  disabled = false,
}: TokenSelectorProps): React.ReactElement {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpenModal = useCallback(() => {
    if (!disabled) {
      setModalVisible(true);
    }
  }, [disabled]);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleTokenSelect = useCallback(
    (token: TokenSelectorToken) => {
      onTokenSelect(token);
      setModalVisible(false);
    },
    [onTokenSelect]
  );

  const handleChangeText = useCallback(
    (text: string) => {
      // Allow only valid numeric input
      const sanitized = text.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitized.split('.');
      const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
      onChangeValue(formatted);
    },
    [onChangeValue]
  );

  const tokenName =
    selectedToken?.name || selectedToken?.symbol || t('wallet.select_token', 'Select');
  const tokenSymbol = selectedToken?.symbol;
  const tokenLogo = selectedToken?.logo;
  const tokenAddress = selectedToken?.mint || selectedToken?.address;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          keyboardType="decimal-pad"
          editable={!disabled}
        />
      </View>

      <TouchableOpacity
        style={[styles.selectorButton, disabled && styles.selectorButtonDisabled]}
        onPress={handleOpenModal}
        activeOpacity={0.7}
        disabled={disabled}
      >
        {tokenLogo ? (
          <Image source={{ uri: tokenLogo }} style={styles.tokenIcon} />
        ) : (
          <View style={[styles.tokenIcon, styles.tokenIconPlaceholder]} />
        )}
        <View style={styles.tokenTextContainer}>
          <TextInput
            style={styles.tokenName}
            value={tokenName}
            editable={false}
            numberOfLines={1}
          />
          {tokenSymbol && tokenAddress && (
            <TextInput
              style={styles.tokenAddress}
              value={getShortAddress(tokenAddress)}
              editable={false}
              numberOfLines={1}
            />
          )}
        </View>
        <View style={styles.chevron}>
          <TextInput style={styles.chevronIcon} value=">" editable={false} />
        </View>
      </TouchableOpacity>

      <TokenSelectorModal
        visible={modalVisible}
        onClose={handleCloseModal}
        tokens={tokens}
        featuredTokens={featuredTokens}
        onSelect={handleTokenSelect}
        onSearch={onSearch}
        hiddenBalance={hiddenBalance}
        showNetworkChip={showNetworkChip}
        showVerifiedDisclaimer={showVerifiedDisclaimer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.scanner.background,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    borderWidth: borderWidth.thin,
    borderColor: colors.scanner.surface,
  },
  inputContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  input: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.scanner.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 120,
  },
  selectorButtonDisabled: {
    opacity: opacity.disabled,
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.xl,
    marginRight: spacing.sm,
  },
  tokenIconPlaceholder: {
    backgroundColor: colors.scanner.button,
  },
  tokenTextContainer: {
    flex: 1,
  },
  tokenName: {
    color: colors.text.primary,
    fontSize: fontSize.base,
    fontFamily: fontFamilyNative.medium,
    fontWeight: fontWeight.medium,
    padding: 0,
  },
  tokenAddress: {
    color: colors.text.secondary,
    fontSize: 11,
    marginTop: 1,
    padding: 0,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  chevronIcon: {
    color: colors.text.secondary,
    fontSize: fontSize.base,
    padding: 0,
  },
});
