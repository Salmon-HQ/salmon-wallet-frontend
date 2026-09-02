/**
 * WalletHeader — the wallet's top row: avatar, account name, address, copy, gear.
 *
 * It is a header and nothing more. It sits on the same plane as the balance
 * below it, owns its own slot (safe area + `spacing.screenTop` + the row), and
 * never lifts, slides, or reveals a panel from behind itself. When a task
 * takes the screen it leaves and returns with the content's own sink/float
 * verb at chrome scale — a conditional mount, the same mechanism the Home
 * content uses.
 *
 * It is laid out in flow as Home's first child, not in an absolute slot: it
 * owns the screen's top padding (safe area + `spacing.screenTop`) and the row
 * height under it, and nothing scrolls behind it — so it needs no band, no
 * mask and no reserved offset from its host.
 */

import {
  componentSizes,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  fontWeight,
  letterSpacing,
  ms,
  s,
  spacing,
  vs,
  getNetworkLabel,
  getShortAddress,
  motionMs,
  type Semantic,
} from '@salmon/shared';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Reanimated, { useReducedMotion } from 'react-native-reanimated';
import { CheckIcon } from '../../icons';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { BrandMark } from '../BrandMark';
import { Chip } from '../Chip';
import { IconBubble } from '../IconBubble';
import { ContentCopySvgIcon, SettingsSvgIcon } from '../Icon';
import {
  CHROME_SCALE,
  floatEntering,
  sinkExiting,
  SINK_FLOAT_TRAVEL,
} from '../../utils/sinkAndFloat';
import { useTaskChrome } from '../../contexts/TaskChromeContext';
import { useThemedStyles, useSemantic } from '../../theme/useThemedStyles';
import type { WalletHeaderProps } from './types';

/** Left thumb — the account's own face, a 38pt circle; opens the wallet switcher. */
const WALLET_THUMB_SIZE = 38;
/** Right control (settings) — 36x36 circle. */
const SETTINGS_BUTTON_SIZE = 36;
/** The salmon mark standing in for a missing avatar, and the gear glyph. */
const WALLET_THUMB_GLYPH_SIZE = 18;
const SETTINGS_GLYPH_SIZE = 18;

// ============================================================================
// Props
// ============================================================================

export type { WalletHeaderProps };

// ============================================================================
// Component
// ============================================================================

export function WalletHeader({
  accountName,
  address,
  networkId,
  onCopyAddress,
  onSettingsPress,
  onWalletPress,
  developerMode = false,
  avatarUrl,
}: WalletHeaderProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text, status } = useSemantic();
  const [imgError, setImgError] = useState(false);
  const { copied, scale: tickScale, trigger: showCopied } = useCopyFeedback();
  const isReduceMotionEnabled = useReducedMotion();
  const insets = useSafeAreaInsets();
  // The signal a task flow publishes while it owns the screen.
  const { isTaskEngaged } = useTaskChrome();

  // The redesign's screen top: safe area, then `screenTop`, then the row
  // itself. Deliberately unscaled.
  const headerTopPadding = insets.top + spacing.screenTop;
  const slotHeight = headerTopPadding + componentSizes.walletHeaderRowHeight;

  // Chrome-scale sink and float for the account text: when the active chain
  // switches, the address half of the line changes, so the text is keyed on
  // `address` and speaks the same verb as home's chain swap — half the
  // travel, shorter clock, because this is chrome, not content. On first
  // mount nothing sinks, so the float takes no delay (same render-time
  // pattern as home's `chainSwap`).
  const [addressSwap, setAddressSwap] = useState({ address, hasPrior: false });
  if (addressSwap.address !== address) {
    setAddressSwap({ address, hasPrior: true });
  }

  const handleCopyPress = useCallback(() => {
    onCopyAddress?.();
    showCopied();
  }, [onCopyAddress, showCopied]);

  const handleSettingsPress = useCallback(() => {
    onSettingsPress?.();
  }, [onSettingsPress]);

  const handleWalletPress = useCallback(() => {
    onWalletPress?.();
  }, [onWalletPress]);

  const truncatedAddress = getShortAddress(address, developerMode ? 8 : 4) ?? address;
  const networkLabel = getNetworkLabel(networkId ?? 'solana-mainnet');

  return (
    <View pointerEvents="box-none" style={{ height: slotHeight }}>
      <View style={{ height: headerTopPadding }} />
      {isTaskEngaged ? null : (
        <Reanimated.View
          testID="wallet-header-bar"
          style={styles.container}
          entering={floatEntering(isReduceMotionEnabled, {
            distance: SINK_FLOAT_TRAVEL / 2,
            scale: CHROME_SCALE,
            durationMs: motionMs.drift,
          })}
          exiting={sinkExiting(isReduceMotionEnabled, {
            distance: SINK_FLOAT_TRAVEL / 2,
            scale: CHROME_SCALE,
            durationMs: motionMs.ebb,
          })}
        >
          {/* Left side - wallet thumb + Account info */}
          <View style={styles.leftSection}>
            {/* The wallet thumb is the account's own picture: the identity the
            user recognises sits where the identity switcher is. A generic
            wallet glyph said nothing about *which* wallet is open. The salmon
            mark stands in when the account has no avatar. */}
            <IconBubble
              testID="wallet-header-account-switcher"
              size={WALLET_THUMB_SIZE}
              // A circle, matching the gear circle at the other end of the row:
              // the two ends of the header are the same object at the same size,
              // and a rounded square on the left made them read as two different
              // kinds of control (owner, on device).
              shape="circle"
              tone="ink"
              onPress={handleWalletPress}
              accessibilityLabel={t('accessibility.switch_wallet')}
              hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
            >
              {avatarUrl && !imgError ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <BrandMark size={s(WALLET_THUMB_GLYPH_SIZE)} />
              )}
            </IconBubble>

            <View style={styles.accountInfo}>
              {/* Only the text travels — the copy button and its feedback state
              stay mounted (remounting would reset the tick mid-hold). */}
              <Reanimated.View
                key={address}
                testID="wallet-header-account-text"
                style={styles.accountTextWrapper}
                entering={floatEntering(isReduceMotionEnabled, {
                  distance: SINK_FLOAT_TRAVEL / 2,
                  scale: CHROME_SCALE,
                  durationMs: motionMs.drift,
                  delayMs: addressSwap.hasPrior ? motionMs.ebb + motionMs.stagger : 0,
                })}
                exiting={sinkExiting(isReduceMotionEnabled, {
                  distance: SINK_FLOAT_TRAVEL / 2,
                  scale: CHROME_SCALE,
                  durationMs: motionMs.ebb,
                })}
              >
                {/* Two lines per `.pen` CORE 01: the name the user named the
                wallet, and the short address under it. Both are the same
                affordance as the thumb beside them — they open the account
                switcher. Only the avatar was tappable once, which left the
                obvious target (the name the user is reading) inert. */}
                <TouchableOpacity
                  testID="wallet-header-account-name"
                  onPress={handleWalletPress}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('accessibility.switch_wallet')}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text
                    style={styles.accountName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    maxFontSizeMultiplier={fontScaleCap.chrome}
                  >
                    {accountName}
                  </Text>
                  <View style={styles.addressLine}>
                    <Text
                      style={styles.accountAddress}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                      maxFontSizeMultiplier={fontScaleCap.chrome}
                    >
                      {truncatedAddress}
                    </Text>
                    {networkLabel && (
                      <Chip
                        testID="wallet-header-network-chip"
                        size="sm"
                        variant="outline"
                        label={networkLabel}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </Reanimated.View>
              <TouchableOpacity
                testID="wallet-header-copy-address"
                onPress={handleCopyPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  copied
                    ? t('actions.copied')
                    : t('accessibility.copy_address', { address: truncatedAddress })
                }
                style={styles.copyButton}
                hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
              >
                {/* 23 not 30: the copy glyph fills ~77% of its 24px viewBox vs the
                settings glyph's ~60%, so it renders larger at the same size. */}
                {/* UNRESOLVED: this swap does not paint on device.
                Instrumented on the real mount path: the handler fires,
                `copied` flips true and reverts 1519ms later, matching
                `motionMs.feedbackHold` almost exactly — so the state and the
                timing are correct and React commits the change. The glyph on
                screen never changes for the whole hold. Ruled out: the spring
                and the Animated.View (stripped entirely, still no paint), and
                the header coming from the navigator's `screenOptions`
                (`headerShown` is false; this is a plain `headerContent` prop
                inside the header row). Adding a `key` per branch was tried and
                removed — the two branches are different component types, so
                React already unmounts and remounts across them and a key
                changes nothing.
                What has NOT been ruled out is a native-side cause, which is
                where the next attempt should start. `ReceiveSheet` and
                `TransactionDetailModal` drive the same hook correctly, so the
                difference is this mount site, not the hook.
                `.maestro/flows/smoke/home/copy-address-checkmark.yaml` asserts
                the real behaviour on a device; Jest cannot, because its
                renderer does not reproduce native paint. */}
                {copied ? (
                  <Animated.View style={{ transform: [{ scale: tickScale }] }}>
                    <CheckIcon size={s(23)} color={status.success} />
                  </Animated.View>
                ) : (
                  <ContentCopySvgIcon size={s(23)} color={text.secondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Right side - the gear, opens Settings. It reads as what it does; the
          avatar it replaced read as an identity and pointed at the wrong
          screen. */}
          <IconBubble
            testID="wallet-header-settings-button"
            size={SETTINGS_BUTTON_SIZE}
            tone="ink"
            icon={SettingsSvgIcon}
            iconSize={SETTINGS_GLYPH_SIZE}
            onPress={handleSettingsPress}
            accessibilityLabel={t('accessibility.open_settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
        </Reanimated.View>
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      // The row is exactly as tall as its own content — the 38pt account thumb.
      height: componentSizes.walletHeaderRowHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      // The redesign's one gutter: the thumb's left edge and the balance's left
      // edge below it are the same line.
      paddingHorizontal: s(spacing.screenGutter),
    },
    leftSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.base),
    },
    accountInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
    },
    // The flex/minWidth pair moved from the Text to this wrapper when the text
    // gained its animated shell — the row math is unchanged.
    accountTextWrapper: {
      flex: 1,
      minWidth: 0,
    },
    // `.pen` draws 14/700 over 11/500. 14 is `fontSize.body`; there is no 11
    // step, so the address takes the nearest one (`caption`, 12) — the scale is
    // the contract, the frame is the sketch.
    accountName: {
      fontSize: ms(fontSize.body),
      fontFamily: fontFamilyNative.bold,
      fontWeight: fontWeight.bold,
      color: t.text.primary,
      letterSpacing: letterSpacing.normal,
      lineHeight: vs(18),
    },
    /** Row anatomy: the address and the environment chip read as one line. */
    addressLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.xs),
    },
    accountAddress: {
      fontSize: ms(fontSize.caption),
      fontFamily: fontFamilyNative.medium,
      fontWeight: fontWeight.medium,
      // The `.pen`'s muted address: no salmon in the header, and the name is
      // the line that has to carry.
      color: t.text.tertiary,
      letterSpacing: letterSpacing.label,
      lineHeight: vs(15),
    },
    copyButton: {
      flexShrink: 0,
      padding: s(spacing.xs),
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
  });
