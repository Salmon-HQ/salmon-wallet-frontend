import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  colors,
  gradients,
  shadows,
  fontFamilyNative,
  fontScaleCap,
  ms,
  vs,
  s,
  useAddressValidation,
  useCurrencyContext,
  useSendContacts,
  getShortAddress,
  fontSize,
  borderRadius,
  borderWidth,
  spacing,
  opacity,
  componentSizes,
} from '@salmon/shared';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BlurContainer } from '../BlurContainer';
import { TokenLogo } from '../TokenLogo';
import { QRScanner } from '../QRScanner';
import type { QRScanResult } from '../QRScanner';
import type { StepAddressAmountProps } from './types';

// ============================================================================
// Constants
// ============================================================================

const QUICK_FILL_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: 'MAX', value: 1 },
] as const;

// ============================================================================
// Component
// ============================================================================

export const StepAddressAmount: React.FC<StepAddressAmountProps> = ({
  token,
  liveBalance,
  blockchain,
  account,
  onBack,
  onReview,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [{ currency }, { formatPrecise }] = useCurrencyContext();
  const { actionRowBottomPadding, compactContentBottomPadding } = useBottomSheetChrome();
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = useCallback((result: QRScanResult) => {
    setAddress(result.address);
    if (result.amount) {
      setAmount(result.amount);
    }
    setShowScanner(false);
  }, []);

  // Address book contacts and own wallets
  const senderAddress = account.getReceiveAddress();
  const { contacts, ownWallets, isLoading: _contactsLoading } = useSendContacts(senderAddress);

  // Address validation — account owns its own connection/provider
  const {
    validationState,
    isValidating,
    isValid: isAddressValid,
    resolvedAddress,
    message: addressMessage,
    messageType: addressMessageType,
  } = useAddressValidation(address, account, {
    debounceMs: 500,
  });

  // Parse balance — prefer the live value passed by the parent (re-read from
  // the reactive tokens list each render) over the prop snapshot taken when
  // the step opened. Falls back to token.uiAmount only when no live entry is
  // available (e.g. the token is not in the latest list yet).
  const tokenBalance = useMemo(() => {
    if (typeof liveBalance === 'number' && Number.isFinite(liveBalance)) {
      return liveBalance;
    }
    return typeof token.uiAmount === 'string'
      ? parseFloat(token.uiAmount)
      : token.uiAmount;
  }, [liveBalance, token.uiAmount]);

  // Fiat conversion
  const fiatDisplay = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    if (!token.price || numAmount === 0) return `${formatPrecise(0)} ${currency.toUpperCase()}`;
    return `${formatPrecise(numAmount * token.price)} ${currency.toUpperCase()}`;
  }, [amount, token.price, formatPrecise, currency]);

  // Balance display
  const balanceDisplay = useMemo(() => {
    if (tokenBalance === 0) return `0 ${token.symbol}`;
    return `${Number(tokenBalance.toFixed(4))} ${token.symbol}`;
  }, [tokenBalance, token.symbol]);

  // Validate form (address must be validated AND amount must be valid)
  const isValid = useMemo(() => {
    const numAmount = parseFloat(amount);
    const amountValid = !isNaN(numAmount) && numAmount > 0 && numAmount <= tokenBalance;
    return isAddressValid && !isValidating && amountValid;
  }, [isAddressValid, isValidating, amount, tokenBalance]);

  // Handle quick fill
  const handleQuickFill = useCallback(
    (percentage: number) => {
      const fillAmount = tokenBalance * percentage;
      // Truncate to reasonable decimal places based on token decimals
      const decimals = token.decimals ?? 9;
      const truncated = Math.floor(fillAmount * 10 ** decimals) / 10 ** decimals;
      setAmount(truncated > 0 ? truncated.toString() : '0');
    },
    [tokenBalance, token.decimals]
  );

  // Handle review press
  const handleReview = useCallback(() => {
    if (isValid) {
      onReview(address.trim(), amount, resolvedAddress || undefined);
    }
  }, [isValid, address, amount, onReview, resolvedAddress]);

  // Placeholder text based on blockchain
  const addressPlaceholder = useMemo(() => {
    switch (blockchain) {
      case 'solana':
        return t('token.send.blockchainAddress', { blockchain: 'Solana', defaultValue: 'Solana Address' });
      case 'ethereum':
        return t('token.send.blockchainAddress', { blockchain: 'Ethereum', defaultValue: 'Ethereum Address' });
      case 'bitcoin':
        return t('token.send.blockchainAddress', { blockchain: 'Bitcoin', defaultValue: 'Bitcoin Address' });
      default:
        return t('token.send.recipient', 'Recipient Address');
    }
  }, [blockchain, t]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: compactContentBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected Token Card */}
        <TouchableOpacity
          testID="send-selected-token"
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityLabel={`Selected token: ${token.name}`}
        >
          <BlurContainer style={styles.tokenCard}>
          <View style={styles.tokenCardLeft}>
            <TokenLogo uri={token.logo || undefined} symbol={token.symbol} size={ms(36)} style={{ marginRight: s(spacing.base) }} />
            <Text style={styles.tokenCardName} numberOfLines={1}>
              {token.symbol}
            </Text>
          </View>
          <Text style={styles.tokenCardBalance} numberOfLines={1}>
            {balanceDisplay}
          </Text>
          </BlurContainer>
        </TouchableOpacity>

        {/* Recipient */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('token.send.recipient', 'Recipient')}</Text>
          <BlurContainer style={[
            styles.inputContainer,
            validationState === 'invalid' && styles.inputContainerError,
            validationState === 'warning' && styles.inputContainerWarning,
            validationState === 'valid' && styles.inputContainerSuccess,
          ]}>
            <TextInput
              testID="send-recipient-input"
              style={styles.textInput}
              placeholder={addressPlaceholder}
              placeholderTextColor={colors.text.secondary}
              value={address}
              onChangeText={setAddress}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
            />
            <TouchableOpacity
              testID="send-scan-button"
              accessibilityRole="button"
              accessibilityLabel={t('qrScanner.scanButton', 'Scan QR code')}
              onPress={() => setShowScanner(true)}
              style={styles.scanButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name="qr-code-outline"
                size={ms(20)}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
            {/* Validation indicator */}
            {address.length > 0 && isValidating && (
              <ActivityIndicator
                size="small"
                color={colors.text.secondary}
                style={styles.validationIndicator}
              />
            )}
            {address.length > 0 && !isValidating && validationState === 'valid' && (
              <Text style={[styles.validationIndicator, styles.validIcon]}>{'\u2713'}</Text>
            )}
            {address.length > 0 && !isValidating && validationState === 'invalid' && (
              <Text style={[styles.validationIndicator, styles.invalidIcon]}>{'\u2715'}</Text>
            )}
            {address.length > 0 && !isValidating && validationState === 'warning' && (
              <Text style={[styles.validationIndicator, styles.warningIcon]}>{'\u26A0'}</Text>
            )}
          </BlurContainer>
          {/* Validation message */}
          {addressMessage && (
            <Text style={[
              styles.validationMessage,
              addressMessageType === 'error' && styles.validationMessageError,
              addressMessageType === 'warning' && styles.validationMessageWarning,
            ]}>
              {addressMessage}
            </Text>
          )}
        </View>

        {/* My Wallets */}
        {address.length === 0 && ownWallets.length > 0 && (
          <View style={styles.contactSection}>
            <Text style={styles.contactSectionHeader}>{t('token.send.myWallets')}</Text>
            {ownWallets.map((wallet) => (
              <TouchableOpacity
                key={wallet.address}
                style={styles.contactRow}
                onPress={() => setAddress(wallet.address)}
                activeOpacity={0.7}
              >
                <Text style={styles.contactName} numberOfLines={1}>{wallet.accountName}</Text>
                <Text style={styles.contactAddress} numberOfLines={1}>{getShortAddress(wallet.address)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Address Book */}
        {address.length === 0 && contacts.length > 0 && (
          <View style={styles.contactSection}>
            <Text style={styles.contactSectionHeader}>{t('token.send.addressBook')}</Text>
            {contacts.map((contact) => (
              <TouchableOpacity
                key={contact.address}
                style={styles.contactRow}
                onPress={() => setAddress(contact.address)}
                activeOpacity={0.7}
              >
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
                  <Text style={styles.contactAddress} numberOfLines={1}>{getShortAddress(contact.address)}</Text>
                </View>
                <View style={styles.blockchainBadge}>
                  <Text style={styles.blockchainBadgeText}>
                    {contact.blockchain.charAt(0).toUpperCase() + contact.blockchain.slice(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('token.send.amountLabel', 'Amount')}</Text>
          <BlurContainer style={styles.amountInputContainer}>
            <TextInput
              testID="send-amount-input"
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={colors.text.secondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              autoCorrect={false}
            />
            <View style={styles.quickFillButtons}>
              {QUICK_FILL_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  testID={`send-quickfill-${option.label.replace('%', '')}`}
                  style={styles.quickFillButton}
                  onPress={() => handleQuickFill(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickFillText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </BlurContainer>
        </View>

        {/* USD Conversion */}
        <Text style={styles.usdConversion}>{fiatDisplay}</Text>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={[styles.bottomButtons, { paddingBottom: actionRowBottomPadding }]}>
        <TouchableOpacity
          testID="send-cancel-button"
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={fontScaleCap.chrome}>{t('actions.cancel', 'Cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="send-review-button"
          style={[styles.reviewButton, !isValid && styles.reviewButtonDisabled]}
          onPress={handleReview}
          activeOpacity={0.7}
          disabled={!isValid}
        >
          <LinearGradient
            colors={isValid ? [...gradients.primary.colors] : [...gradients.disabled.colors]}
            style={styles.reviewButtonGradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.4 }}
          >
            <Text style={styles.reviewButtonText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={fontScaleCap.chrome}>{t('token.send.reviewAndSend', 'Review & Send')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <QRScanner
        visible={showScanner}
        blockchain={blockchain}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />
    </KeyboardAvoidingView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s(spacing.headerPadding),
  },
  // Token Card
  tokenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: ms(borderRadius.button),
    paddingVertical: vs(spacing.lg),
    paddingHorizontal: s(spacing.lg),
    marginBottom: vs(spacing['2xl']),
  },
  tokenCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokenCardName: {
    fontSize: ms(fontSize.md),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
  },
  tokenCardBalance: {
    fontSize: ms(fontSize.md),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
  },
  // Fields
  fieldGroup: {
    marginBottom: vs(spacing.xl),
  },
  fieldLabel: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    marginBottom: vs(spacing.sm),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(borderRadius.lg),
    paddingHorizontal: s(spacing.lg),
    minHeight: vs(componentSizes.buttonHeightMedium),
  },
  inputContainerError: {
    borderWidth: borderWidth.thin,
    borderColor: colors.status.error,
  },
  inputContainerWarning: {
    borderWidth: borderWidth.thin,
    borderColor: colors.status.warning,
  },
  inputContainerSuccess: {
    borderWidth: borderWidth.thin,
    borderColor: colors.status.success,
  },
  textInput: {
    flex: 1,
    fontSize: ms(fontSize.md),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  scanButton: {
    padding: s(spacing.xs),
    marginLeft: s(spacing.sm),
  },
  validationIndicator: {
    marginLeft: s(spacing.sm),
  },
  validIcon: {
    fontSize: ms(fontSize.md),
    color: colors.status.success,
  },
  invalidIcon: {
    fontSize: ms(fontSize.md),
    color: colors.status.error,
  },
  warningIcon: {
    fontSize: ms(fontSize.md),
    color: colors.status.warning,
  },
  validationMessage: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    marginTop: vs(spacing.xs),
  },
  validationMessageError: {
    color: colors.status.error,
  },
  validationMessageWarning: {
    color: colors.status.warning,
  },
  // Contact / Wallet sections
  contactSection: {
    marginBottom: vs(spacing.lg),
  },
  contactSectionHeader: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.secondary,
    marginBottom: vs(spacing.sm),
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: ms(borderRadius.badge),
    paddingVertical: vs(spacing.md),
    paddingHorizontal: s(spacing.lg),
    marginBottom: vs(spacing.xs),
  },
  contactInfo: {
    flex: 1,
    marginRight: s(spacing.sm),
  },
  contactName: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
  },
  contactAddress: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    marginTop: vs(spacing.xxs),
  },
  blockchainBadge: {
    backgroundColor: colors.background.tertiary,
    borderRadius: ms(borderRadius.sm),
    paddingHorizontal: s(spacing.sm),
    paddingVertical: vs(spacing.xxs),
    flexShrink: 0,
  },
  blockchainBadgeText: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
  },
  // Amount
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(borderRadius.lg),
    paddingHorizontal: s(spacing.lg),
    minHeight: vs(componentSizes.buttonHeightMedium),
  },
  amountInput: {
    flex: 1,
    fontSize: ms(fontSize.md),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  quickFillButtons: {
    flexDirection: 'row',
    gap: s(spacing.xs),
  },
  quickFillButton: {
    backgroundColor: colors.button.secondaryBackground,
    borderRadius: ms(borderRadius.sm),
    paddingHorizontal: s(spacing.base),
    paddingVertical: vs(spacing.xs),
  },
  quickFillText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    textTransform: 'uppercase',
  },
  // USD
  usdConversion: {
    fontSize: ms(fontSize.xl),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: vs(spacing.xs),
  },
  // Bottom Buttons
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: s(spacing.headerPadding),
    paddingTop: vs(spacing.md),
    gap: s(spacing.md),
  },
  cancelButton: {
    flex: 1,
    minHeight: vs(componentSizes.buttonHeightMedium),
    borderRadius: ms(borderRadius.lg),
    borderWidth: borderWidth.thin,
    borderColor: colors.accent.border,
    backgroundColor: colors.button.cancelBackground,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  cancelButtonText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
  },
  reviewButton: {
    flex: 1,
    minHeight: vs(componentSizes.buttonHeightMedium),
    borderRadius: ms(borderRadius.lg),
    overflow: 'hidden',
    borderWidth: borderWidth.thin,
    borderColor: colors.accent.border,
    ...shadows.button,
  },
  reviewButtonDisabled: {
    opacity: opacity.disabled,
    borderColor: colors.border.default,
  },
  reviewButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(spacing.sm),
  },
  reviewButtonText: {
    fontSize: ms(fontSize.md),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
  },
});

export default StepAddressAmount;
