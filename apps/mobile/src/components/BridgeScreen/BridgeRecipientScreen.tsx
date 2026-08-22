import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  colors,
  fontSize,
  letterSpacing,
  lineHeight,
  spacing,
  borderRadius,
  componentSizes,
  ms,
  vs,
  s,
  fontFamilyNative,
  borderWidth,
  semantic,
} from '@salmon/shared';
import { RecipientAddressInput } from './RecipientAddressInput';
import { PrimaryButton, SecondaryButton } from '../Button';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';
import type { BridgeRecipientScreenProps } from './types';

/**
 * BridgeRecipientScreen - Second step of bridge flow
 * Allows user to enter the recipient address for the destination chain
 */
export const BridgeRecipientScreen: React.FC<BridgeRecipientScreenProps> = ({
  recipientAddress,
  onAddressChange,
  targetChain,
  onBack,
  onContinue,
  isValidAddress,
  addressError,
  style,
}) => {
  const { t } = useTranslation();
  const { floatingBottomOffset, stickyCtaScrollPadding } = useTabChrome();
  const keyboardHeight = useKeyboardHeight();
  const canContinue = isValidAddress && recipientAddress.length > 0;

  // Back/Review live in an absolutely-positioned bar, out of layout flow and
  // therefore out of reach of KeyboardAvoidingView. Lift the bar above the
  // keyboard and grow the scroll padding by the same amount so the address
  // field and the button that acts on it stay reachable together.
  const ctaBottomOffset =
    keyboardHeight > 0 ? keyboardHeight + vs(spacing.sm) : floatingBottomOffset;

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: stickyCtaScrollPadding + keyboardHeight },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>{t('bridge.recipient.title', 'Recipient Address')}</Text>

        {/* Description */}
        <Text style={styles.description}>
          {t(
            'bridge.recipient.description',
            'Enter the address where you want to receive your swapped tokens'
          )}
          {targetChain ? ` on ${targetChain.name}` : ''}.
        </Text>

        {/* Address Input */}
        <View style={styles.inputContainer}>
          <RecipientAddressInput
            value={recipientAddress}
            onChangeValue={onAddressChange}
            targetChain={targetChain}
            label={t('bridge.recipient.destinationAddress', 'Destination Address')}
            placeholder={t('bridge.recipient.enterRecipientAddress', 'Enter recipient address')}
            error={addressError}
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>{t('bridge.recipient.important', 'Important')}</Text>
          <Text style={styles.infoText}>
            {t(
              'bridge.recipient.importantText',
              'Make sure the address is correct. Cross-chain transactions cannot be reversed once initiated.'
            )}
          </Text>
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={[styles.buttonsContainer, { bottom: ctaBottomOffset }]}>
        <SecondaryButton onPress={onBack} style={styles.backButton}>
          {t('actions.back', 'Back')}
        </SecondaryButton>
        <PrimaryButton onPress={onContinue} disabled={!canContinue} style={styles.continueButton}>
          {t('bridge.recipient.review', 'Review')}
        </PrimaryButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: s(spacing.headerPadding),
    paddingTop: vs(spacing['2xl']),
  },
  title: {
    fontSize: ms(fontSize.headline),
    fontFamily: fontFamilyNative.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: letterSpacing.snug,
    lineHeight: ms(24 * lineHeight.condensed),
    marginBottom: vs(spacing.md),
  },
  description: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(fontSize.base * lineHeight.tokenListItem),
    marginBottom: vs(spacing['2xl']),
  },
  inputContainer: {
    marginBottom: vs(spacing['2xl']),
  },
  infoBox: {
    backgroundColor: colors.background.tokenItem,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.thin,
    borderColor: colors.border.default,
    padding: s(spacing.base),
    marginBottom: vs(spacing['2xl']),
  },
  infoTitle: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: semantic.status.warning,
    marginBottom: vs(spacing.xs),
    letterSpacing: letterSpacing.normal,
  },
  infoText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(fontSize.sm * lineHeight.normal),
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: s(spacing.md),
    position: 'absolute',
    left: s(spacing.headerPadding),
    right: s(spacing.headerPadding),
  },
  // Height only: radius, fill, border and material belong to the button.
  backButton: {
    flex: 1,
    minHeight: vs(componentSizes.buttonHeightCompact),
    height: vs(componentSizes.buttonHeightCompact),
  },
  continueButton: {
    flex: 1,
    minHeight: vs(componentSizes.buttonHeightCompact),
    height: vs(componentSizes.buttonHeightCompact),
  },
});

export default BridgeRecipientScreen;
