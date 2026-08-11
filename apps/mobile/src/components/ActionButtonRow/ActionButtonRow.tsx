import {
  borderWidth,
  colors,
  componentSizes,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  gradients,
  ms,
  s,
  spacing,
} from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BlurContainer } from '../BlurContainer';
import {
  CallMadeSvgIcon,
  QrCodeScannerSvgIcon,
  ReceiptLongSvgIcon,
} from '../Icon/SvgIcons';
import type { ActionButtonRowProps } from './types';

const ACTION_BUTTON_ICON_SIZE = fontSize.lg;
const ACTION_BUTTON_TEXT_SIZE = fontSize.md;

/**
 * ActionButtonRow component for primary wallet actions
 *
 * Displays three main action buttons:
 * - Send: Primary orange gradient button
 * - Receive: Secondary glass effect button
 * - Activity: Secondary glass effect button
 *
 * iOS 26+: Uses native Liquid Glass effect via expo-glass-effect
 * iOS < 26 / Android: Falls back to BlurView with enhanced glass simulation
 *
 * @example
 * ```tsx
 * <ActionButtonRow
 *   onSendPress={() => navigation.navigate('Send')}
 *   onReceivePress={() => navigation.navigate('Receive')}
 *   onActivityPress={() => navigation.navigate('Activity')}
 * />
 * ```
 */

export const ActionButtonRow: React.FC<ActionButtonRowProps> = ({
  onSendPress,
  onReceivePress,
  onActivityPress,
  sendDisabled = false,
  receiveDisabled = false,
  activityDisabled = false,
  style,
}) => {
  const { t } = useTranslation();

  const handleSendPress = useCallback(() => {
    if (!sendDisabled) {
      onSendPress?.();
    }
  }, [onSendPress, sendDisabled]);

  const handleReceivePress = useCallback(() => {
    if (!receiveDisabled) {
      onReceivePress?.();
    }
  }, [onReceivePress, receiveDisabled]);

  const handleActivityPress = useCallback(() => {
    if (!activityDisabled) {
      onActivityPress?.();
    }
  }, [onActivityPress, activityDisabled]);

  return (
    <View style={[styles.container, style]}>
      {/* Send Button - Primary */}
      <TouchableOpacity
        testID="home-send-button"
        style={[styles.buttonWrapper, sendDisabled && styles.buttonDisabled]}
        onPress={handleSendPress}
        activeOpacity={0.8}
        disabled={sendDisabled}
        accessibilityRole="button"
        accessibilityLabel={t('accessibility.send_tokens', 'Send tokens')}
      >
        <LinearGradient
          colors={sendDisabled ? gradients.disabled.colors : gradients.primaryButton.colors}
          start={gradients.primaryButton.start}
          end={gradients.primaryButton.end}
          style={styles.primaryButton}
        >
          <CallMadeSvgIcon size={ms(ACTION_BUTTON_ICON_SIZE)} color={colors.text.balance} />
          <Text style={styles.primaryButtonText} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={fontScaleCap.chrome}>{t('actions.send', 'Send')}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Receive Button - Secondary with BlurContainer */}
      <View style={[styles.buttonWrapper, receiveDisabled && styles.buttonDisabled]}>
        <BlurContainer
          style={styles.secondaryButton}
          borderColor={colors.accent.primary}
          borderWidth={borderWidth.actionButton}
        >
          <TouchableOpacity
            testID="home-receive-button"
            style={styles.secondaryButtonContent}
            onPress={handleReceivePress}
            activeOpacity={0.8}
            disabled={receiveDisabled}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.receive_tokens', 'Receive tokens')}
          >
            <QrCodeScannerSvgIcon
              size={ms(ACTION_BUTTON_ICON_SIZE)}
              color={receiveDisabled ? colors.button.disabledText : colors.text.balance}
            />
            <Text style={[styles.secondaryButtonText, receiveDisabled && styles.textDisabled]} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={fontScaleCap.chrome}>
              {t('actions.receive', 'Receive')}
            </Text>
          </TouchableOpacity>
        </BlurContainer>
      </View>

      {/* Activity Button - Secondary with BlurContainer */}
      <View style={[styles.buttonWrapper, activityDisabled && styles.buttonDisabled]}>
        <BlurContainer
          style={styles.secondaryButton}
          borderColor={colors.accent.primary}
          borderWidth={borderWidth.actionButton}
        >
          <TouchableOpacity
            testID="home-activity-button"
            style={styles.secondaryButtonContent}
            onPress={handleActivityPress}
            activeOpacity={0.8}
            disabled={activityDisabled}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.view_activity', 'View activity')}
          >
            <ReceiptLongSvgIcon
              size={ms(ACTION_BUTTON_ICON_SIZE)}
              color={activityDisabled ? colors.button.disabledText : colors.text.balance}
            />
            <Text style={[styles.secondaryButtonText, activityDisabled && styles.textDisabled]} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={fontScaleCap.chrome}>
              {t('actions.activity', 'Activity')}
            </Text>
          </TouchableOpacity>
        </BlurContainer>
      </View>
    </View>
  );
};

// Figma spec dimensions - Updated to match new design
// Container: paddingHorizontal: 40px
// Buttons: width: 112px, height: 47px, borderRadius: 14px, gap: 8px
// Icons: ~15px
// Text: fontSize: 14.5px, lineHeight: 1.5
// Border: 0.5px rgba(255,92,69,0.8)

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(spacing['4xl']), // 40px
  },
  buttonWrapper: {
    width: s(componentSizes.actionButtonWidth), // 112px
    minHeight: ms(componentSizes.actionButtonHeight), // 47px
    borderRadius: ms(componentSizes.actionButtonRadius), // 14px
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: colors.button.disabledOpacity,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.sm), // 8px
    borderRadius: ms(componentSizes.actionButtonRadius), // 14px
    borderWidth: borderWidth.actionButton, // 0.5px
    borderColor: colors.accent.border,
  },
  primaryButtonText: {
    flexShrink: 1,
    fontSize: ms(ACTION_BUTTON_TEXT_SIZE),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.balance,
    lineHeight: ms(ACTION_BUTTON_TEXT_SIZE * 1.35),
  },
  secondaryButton: {
    flex: 1,
    borderRadius: ms(componentSizes.actionButtonRadius), // 14px
  },
  secondaryButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.sm), // 8px
  },
  secondaryButtonText: {
    flexShrink: 1,
    fontSize: ms(ACTION_BUTTON_TEXT_SIZE),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.balance,
    lineHeight: ms(ACTION_BUTTON_TEXT_SIZE * 1.35),
  },
  textDisabled: {
    color: colors.button.disabledText,
  },
});

export default ActionButtonRow;
