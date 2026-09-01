/**
 * HeaderContent — Content rendered inside GateContainer when collapsed
 *
 * Displays the wallet header bar: avatar, account name, address, copy, settings.
 * No positioning or animation — GateContainer handles that.
 */

import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  fontWeight,
  letterSpacing,
  ms,
  s,
  spacing,
  vs,
  getShortAddress,
  motionMs,
  semantic,
} from '@salmon/shared';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import Reanimated, { useReducedMotion } from 'react-native-reanimated';
import { CheckIcon } from '../../icons';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { BrandMark } from '../BrandMark';
import { IconBubble } from '../IconBubble';
import { ContentCopySvgIcon, SettingsSvgIcon } from '../Icon';
import {
  CHROME_SCALE,
  floatEntering,
  sinkExiting,
  SINK_FLOAT_TRAVEL,
} from '../../utils/sinkAndFloat';

/** Left thumb — the account's own face, 38x38 r12, opens the wallet switcher. */
const WALLET_THUMB_SIZE = 38;
/** Right control (settings) — 36x36 circle. */
const SETTINGS_BUTTON_SIZE = 36;
/** The salmon mark standing in for a missing avatar, and the gear glyph. */
const WALLET_THUMB_GLYPH_SIZE = 18;
const SETTINGS_GLYPH_SIZE = 18;

// ============================================================================
// Props
// ============================================================================

export interface HeaderContentProps {
  accountName: string;
  address: string;
  onCopyAddress?: () => void;
  onSettingsPress?: () => void;
  onWalletPress?: () => void;
  developerMode?: boolean;
  avatarUrl?: string;
  accountId?: string;
}

// ============================================================================
// Component
// ============================================================================

export function HeaderContent({
  accountName,
  address,
  onCopyAddress,
  onSettingsPress,
  onWalletPress,
  developerMode = false,
  avatarUrl,
}: HeaderContentProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const { copied, scale: tickScale, trigger: showCopied } = useCopyFeedback();
  const isReduceMotionEnabled = useReducedMotion();

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

  return (
    <View style={styles.container}>
      {/* Left side - wallet thumb + Account info */}
      <View style={styles.leftSection}>
        {/* The wallet thumb is the account's own picture: the identity the
            user recognises sits where the identity switcher is. A generic
            wallet glyph said nothing about *which* wallet is open. The salmon
            mark stands in when the account has no avatar. */}
        <IconBubble
          testID="wallet-header-account-switcher"
          size={WALLET_THUMB_SIZE}
          shape="rounded"
          // r12, per `.pen` CORE 01 — the kit's default rounded corner is r16.
          radius="lg"
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
              <Text
                style={styles.accountAddress}
                numberOfLines={1}
                ellipsizeMode="middle"
                maxFontSizeMultiplier={fontScaleCap.chrome}
              >
                {truncatedAddress}
              </Text>
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
                inside GateContainer). Adding a `key` per branch was tried and
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
                <CheckIcon size={s(23)} color={semantic.status.success} />
              </Animated.View>
            ) : (
              <ContentCopySvgIcon size={s(23)} color={semantic.text.accent} />
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
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
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
    color: semantic.text.primary,
    letterSpacing: letterSpacing.normal,
    lineHeight: vs(18),
  },
  accountAddress: {
    fontSize: ms(fontSize.caption),
    fontFamily: fontFamilyNative.medium,
    fontWeight: fontWeight.medium,
    color: semantic.text.secondary,
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
