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
  semantic,
  spacing,
} from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BlurContainer } from '../BlurContainer';
import { FleshBackground } from '../FleshBackground';
import { CallMadeSvgIcon, QrCodeScannerSvgIcon, ReceiptLongSvgIcon } from '../Icon/SvgIcons';
import type { ActionButtonRowProps } from './types';

const ACTION_BUTTON_ICON_SIZE = fontSize.lg;
const ACTION_BUTTON_TEXT_SIZE = fontSize.bodyLg;

/**
 * ActionButtonRow component for primary wallet actions
 *
 * Displays three main action buttons:
 * - Send: the screen's one living thing — a salmon fill with `accent.onFill`
 *   ink at 6.50:1 and the flesh's myoseptal bands pressed into the body
 * - Receive: neutral blurred button
 * - Activity: neutral blurred button
 *
 * The One Living Thing Rule says salmon appears once per screen; it does not
 * say where. All three pills used to carry a salmon border and the Send label
 * was `neutral-100` on the salmon fill at 3.06:1 — three competing warm
 * objects, and a failing label on the loudest of them. The accent is now spent
 * on the single control that moves money; Receive and Activity take
 * `border.raised`, and the tab bar's active item went neutral in return.
 *
 * These pills are content, not chrome: they scroll with the page rather than
 * floating over it, so per DESIGN.md's "Content Is Never Glass" rule they are
 * deliberately not a P3 membrane and do not use `expo-glass-effect`. The
 * canonical membrane is the tab bar (see `Membrane`).
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
          style={[styles.primaryButton, sendDisabled && styles.primaryButtonDisabled]}
        >
          {/* The flesh: the myosepta of a cut fillet, pressed into the salmon
              fill and nowhere else on this screen. Absent when the fill is
              absent. */}
          {!sendDisabled && <FleshBackground />}
          <CallMadeSvgIcon
            size={ms(ACTION_BUTTON_ICON_SIZE)}
            color={sendDisabled ? semantic.text.disabled : semantic.accent.onFill}
          />
          <Text
            style={[styles.primaryButtonText, sendDisabled && styles.textDisabled]}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={fontScaleCap.chrome}
          >
            {t('actions.send', 'Send')}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Receive Button - Secondary with BlurContainer */}
      <View style={[styles.buttonWrapper, receiveDisabled && styles.buttonDisabled]}>
        <BlurContainer
          style={styles.secondaryButton}
          borderColor={semantic.border.raised}
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
              color={receiveDisabled ? semantic.text.disabled : colors.text.balance}
            />
            <Text
              style={[styles.secondaryButtonText, receiveDisabled && styles.textDisabled]}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={fontScaleCap.chrome}
            >
              {t('actions.receive', 'Receive')}
            </Text>
          </TouchableOpacity>
        </BlurContainer>
      </View>

      {/* Activity Button - Secondary with BlurContainer */}
      <View style={[styles.buttonWrapper, activityDisabled && styles.buttonDisabled]}>
        <BlurContainer
          style={styles.secondaryButton}
          borderColor={semantic.border.raised}
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
              color={activityDisabled ? semantic.text.disabled : colors.text.balance}
            />
            <Text
              style={[styles.secondaryButtonText, activityDisabled && styles.textDisabled]}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={fontScaleCap.chrome}
            >
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
    borderColor: semantic.accent.fill,
    // The flesh is drawn at absolute-fill; clip it to the pill's own radius.
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    // Disabled is `surface.crest` with disabled ink; the salmon edge goes with
    // the fill rather than outlining a neutral pill.
    borderColor: semantic.border.raised,
  },
  primaryButtonText: {
    flexShrink: 1,
    fontSize: ms(ACTION_BUTTON_TEXT_SIZE),
    fontFamily: fontFamilyNative.regular,
    // The only legal ink on a salmon fill. Never `text.primary` (3.06:1).
    color: semantic.accent.onFill,
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
    color: semantic.text.disabled,
  },
});

export default ActionButtonRow;
