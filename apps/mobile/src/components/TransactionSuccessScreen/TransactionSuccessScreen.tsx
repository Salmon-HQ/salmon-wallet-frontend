import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import {
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  gradients,
  shadows,
  componentSizes,
  letterSpacing,
  lineHeight,
  ms,
  vs,
  s,
  fontFamilyNative,
  borderWidth,
  semantic,
  tabularNums,
} from '@salmon/shared';
import type { TransactionSuccessScreenProps } from '@salmon/shared';
import { PrimaryButton } from '../Button';
import { LoadingScreen } from '../LoadingScreen';
import { useTabChrome } from '../../../hooks/useTabChrome';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

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

  const statusOpacity = useSharedValue(0);
  // The amount is the hero, so it owns its own node and its own value. The
  // Surfacing (DESIGN.md §The Surfacing) lands here: a `tide`-long timeline
  // clears the material, travels a caustic band up to this node, and settles
  // it with translateY +6 → 0 on `settle`. Only the fade is built; the node,
  // its isolation from the status line, and its locked tabular width are the
  // parts that had to exist first.
  const amountOpacity = useSharedValue(0);
  const linkOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    if (settling) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Status first and small, then the value it is reporting on.
    statusOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    amountOpacity.value = withDelay(
      120,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    linkOpacity.value = withDelay(
      320,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    buttonOpacity.value = withDelay(
      420,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, [settling, statusOpacity, amountOpacity, linkOpacity, buttonOpacity]);

  const statusStyle = useAnimatedStyle(() => ({
    opacity: statusOpacity.value,
  }));

  const amountStyle = useAnimatedStyle(() => ({
    opacity: amountOpacity.value,
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
      {/* Status is a line of ink, not a 96px disc: `status.success` is
          specified as ink (9.99:1), and the outcome the user came for is the
          amount below it. Three channels are kept — colour, the ✓ glyph, and
          the label — so the state never rides on hue alone. */}
      <Animated.View style={[styles.statusRow, statusStyle]}>
        <Text style={styles.statusGlyph}>✓</Text>
        <Text style={styles.statusLabel} testID="tx-success-title">
          {title}
        </Text>
      </Animated.View>

      {/* The hero. Isolated node, tabular digits, nothing between it and the
          bottom of the screen for a caustic band to travel through. */}
      <Animated.View style={[styles.amountContainer, amountStyle]}>
        <Text style={styles.amount} testID="tx-success-summary">
          {summary}
        </Text>
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
              <Text style={styles.bridgeLabel}>
                {t('bridge.estimatedReceive', 'You will receive approximately')}
              </Text>
              <Text style={styles.bridgeValue}>{bridgeAmountOut}</Text>
            </>
          )}
          {bridgeDepositTxId && (
            <>
              <Text style={styles.bridgeLabel}>
                {t('bridge.depositTxId', 'Deposit Transaction')}
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://solscan.io/tx/${bridgeDepositTxId}`)}
              >
                <Text
                  style={[
                    styles.bridgeValue,
                    { color: semantic.text.accent, textDecorationLine: 'underline' },
                  ]}
                >
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
          <TouchableOpacity
            testID="tx-success-explorer-link"
            onPress={handleExplorerPress}
            activeOpacity={0.7}
          >
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
          <PrimaryButton
            onPress={onContinue}
            style={styles.button}
            disabled={settling}
            testID="tx-success-continue-button"
          >
            {t('transaction.continue', 'Back to wallet')}
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
    marginBottom: vs(spacing.md),
  },
  statusGlyph: {
    fontSize: ms(fontSize.body),
    color: semantic.status.success,
    fontFamily: fontFamilyNative.bold,
    fontWeight: fontWeight.bold,
  },
  statusLabel: {
    fontSize: ms(fontSize.micro),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.status.success,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: vs(spacing['2xl']),
  },
  amount: {
    ...TABULAR,
    fontSize: ms(fontSize.display),
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
    textAlign: 'center',
    lineHeight: ms(fontSize.display * lineHeight.condensed),
  },
  bridgeInfoBox: {
    width: '100%',
    backgroundColor: semantic.surface.raised,
    borderRadius: borderRadius.card,
    padding: s(spacing.lg),
    marginBottom: vs(spacing.xl),
  },
  bridgeLabel: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: semantic.text.tertiary,
    marginBottom: vs(spacing.xs),
  },
  bridgeValue: {
    ...TABULAR,
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.primary,
    marginBottom: vs(spacing.md),
  },
  linkContainer: {
    alignItems: 'center',
    marginBottom: vs(spacing['4xl']),
  },
  explorerLink: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.accent,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  buttonGradient: {
    borderRadius: borderRadius.lg,
    borderWidth: borderWidth.accent,
    borderColor: semantic.accent.fill,
    ...shadows.button,
  },
  button: {
    minWidth: s(componentSizes.copyButtonWidth),
    minHeight: vs(componentSizes.buttonHeightCompact),
    backgroundColor: 'transparent',
  },
});
