import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, gradients, shadows, componentSizes, ms, vs, s, fontFamilyNative, borderWidth } from '@salmon/shared';
import type { TransactionSuccessScreenProps } from '@salmon/shared';
import { PrimaryButton } from '../Button';
import { LoadingScreen } from '../LoadingScreen';
import { useTabChrome } from '../../../hooks/useTabChrome';

// ============================================================================
// Component
// ============================================================================

export const TransactionSuccessScreen: React.FC<TransactionSuccessScreenProps> = ({
  title,
  summary,
  explorerUrl,
  onContinue,
  settling = false,
  pendingTitle,
  bridgeDepositAddress,
  bridgeAmountIn,
  bridgeAmountOut,
  bridgeExchangeId,
  bridgeDepositTxId,
}) => {
  const isBridge = !!bridgeDepositAddress;
  const { t } = useTranslation();
  const { floatingBottomOffset } = useTabChrome();

  const circleScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const linkOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    if (settling) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    circleScale.value = withSpring(1, { damping: 12, stiffness: 180, mass: 0.8 });
    checkOpacity.value = withDelay(200, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    textOpacity.value = withDelay(400, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    linkOpacity.value = withDelay(500, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    buttonOpacity.value = withDelay(600, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [settling, circleScale, checkOpacity, textOpacity, linkOpacity, buttonOpacity]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const linkStyle = useAnimatedStyle(() => ({
    opacity: linkOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const handleExplorerPress = () => {
    if (explorerUrl) {
      Linking.openURL(explorerUrl);
    }
  };

  if (settling) {
    return (
      <View style={styles.container}>
        <LoadingScreen
          visible
          title={pendingTitle ?? title}
          subtitle={summary}
          bottomOffset={floatingBottomOffset}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: floatingBottomOffset }]}>
      <Animated.View style={[styles.circleOuter, circleStyle]}>
        <Animated.Text style={[styles.checkmark, checkStyle]}>✓</Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.summary}>{summary}</Text>
      </Animated.View>

      {isBridge ? (
        <Animated.View style={[styles.bridgeInfoBox, linkStyle]}>
          <Text style={styles.bridgeLabel}>{t('bridge.depositAddress', 'Send funds to')}</Text>
          <Text style={styles.bridgeValue}>{bridgeDepositAddress}</Text>
          {bridgeAmountIn && (
            <>
              <Text style={styles.bridgeLabel}>{t('bridge.amountToSend', 'Amount to send')}</Text>
              <Text style={styles.bridgeValue}>{bridgeAmountIn}</Text>
            </>
          )}
          {bridgeAmountOut && (
            <>
              <Text style={styles.bridgeLabel}>{t('bridge.estimatedReceive', 'You will receive approximately')}</Text>
              <Text style={styles.bridgeValue}>{bridgeAmountOut}</Text>
            </>
          )}
          {bridgeDepositTxId && (
            <>
              <Text style={styles.bridgeLabel}>{t('bridge.depositTxId', 'Deposit Transaction')}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`https://solscan.io/tx/${bridgeDepositTxId}`)}>
                <Text style={[styles.bridgeValue, { color: colors.accent.primary, textDecorationLine: 'underline' }]}>
                  {bridgeDepositTxId.slice(0, 8)}...{bridgeDepositTxId.slice(-8)}
                </Text>
              </TouchableOpacity>
            </>
          )}
          {bridgeExchangeId && (
            <>
              <Text style={styles.bridgeLabel}>{t('bridge.exchangeId', 'Exchange ID')}</Text>
              <Text style={[styles.bridgeValue, { marginBottom: 0 }]}>{bridgeExchangeId}</Text>
            </>
          )}
        </Animated.View>
      ) : explorerUrl ? (
        <Animated.View style={[styles.linkContainer, linkStyle]}>
          <TouchableOpacity testID="tx-success-explorer-link" onPress={handleExplorerPress} activeOpacity={0.7}>
            <Text style={styles.explorerLink}>{t('transaction.viewOnExplorer')}</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.buttonContainer, buttonStyle]}>
        <LinearGradient
          colors={gradients.primaryButton.colors}
          start={gradients.primaryButton.start}
          end={gradients.primaryButton.end}
          style={styles.buttonGradient}
        >
          <PrimaryButton onPress={onContinue} style={styles.button} disabled={settling} testID="tx-success-continue-button">
            {t('transaction.continue')}
          </PrimaryButton>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(spacing.headerPadding),
  },
  circleOuter: {
    width: vs(componentSizes.successCircleSize),
    height: vs(componentSizes.successCircleSize),
    borderRadius: vs(48),
    backgroundColor: colors.status.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(spacing['3xl']),
  },
  checkmark: {
    fontSize: ms(fontSize['5xl']),
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontWeight: fontWeight.bold,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: vs(spacing.lg),
  },
  title: {
    fontSize: ms(fontSize['2xl']),
    fontFamily: fontFamilyNative.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: vs(spacing.sm),
  },
  summary: {
    fontSize: ms(fontSize.md),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  bridgeInfoBox: {
    width: '100%',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.card,
    padding: s(spacing.lg),
    marginBottom: vs(spacing.xl),
  },
  bridgeLabel: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.tertiary,
    marginBottom: vs(spacing.xs),
  },
  bridgeValue: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
    marginBottom: vs(spacing.md),
  },
  linkContainer: {
    alignItems: 'center',
    marginBottom: vs(spacing['4xl']),
  },
  explorerLink: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: colors.accent.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  buttonGradient: {
    borderRadius: borderRadius.lg,
    borderWidth: borderWidth.accent,
    borderColor: colors.accent.border,
    ...shadows.button,
  },
  button: {
    minWidth: s(componentSizes.copyButtonWidth),
    minHeight: vs(componentSizes.buttonHeightCompact),
    backgroundColor: 'transparent',
  },
});
